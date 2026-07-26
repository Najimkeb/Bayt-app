import { normalizeText } from '@bayt/domain';

import type { VocabularyGenerator } from '../../ingestion/vocab/vocabulary-generator.js';
import type { VocabWord } from '../../ingestion/vocab/vocab-schema.js';
import type { FrequencyTranche } from '../../ingestion/vocab/tranches.js';
import type {
  DraftCardRecord,
  DraftRecord,
  LessonDraftRepository,
} from '../ports/lesson-draft-repository.js';

/** Entrée de génération de vocabulaire. */
export interface GenerateVocabularyInput {
  readonly tranche: FrequencyTranche;
  readonly domainId: string;
  /** Admin auteur (id de session). */
  readonly createdBy: string;
  /** Nouveaux mots visés par génération (un « paquet » relisable). Défaut 30. */
  readonly batchSize?: number | undefined;
}

/** Récapitulatif d'une génération (économie de quota : chiffres avant/après). */
export interface GenerateVocabularyResult {
  /** Brouillon créé (`null` si 0 nouveau mot → rien à relire). */
  readonly draftId: string | null;
  /** Nouveaux mots visés par cette génération (le paquet). */
  readonly requested: number;
  /** Nouveaux mots réellement ajoutés au brouillon. */
  readonly created: number;
  /** Mots ignorés car déjà connus (dans le domaine) ou déjà proposés. */
  readonly duplicatesSkipped: number;
  /** Nombre d'appels LLM réellement effectués. */
  readonly batches: number;
}

/**
 * Nombre MAX d'appels LLM PAR requête HTTP.
 *
 * Garde-fou double : (1) une requête ne doit jamais enchaîner assez d'appels
 * pour dépasser le délai de la passerelle (une génération géante synchrone
 * expirait et ne persistait RIEN — quota gaspillé) ; (2) économie de quota.
 * Une génération produit donc **un paquet relisable** (~`batchSize` mots) ; on
 * relance pour la suite de la tranche (dédup additive → jamais de doublon).
 */
const MAX_CALLS_PER_REQUEST = 3;

/** Plafond de mots « connus » injectés dans le prompt (anti-bloat). */
const MAX_EXCLUDE_IN_PROMPT = 120;

/**
 * Cas d'usage « générer un paquet de vocabulaire d'une tranche de fréquence ».
 *
 * Produit **un paquet** de ~`batchSize` mots NEUFS (jamais un appel géant) :
 * quelques appels LLM au plus, bornés par `MAX_CALLS_PER_REQUEST`. Chaque mot
 * est **dédupliqué** (comparaison normalisée) contre les mots déjà connus du
 * domaine (publiés ET en brouillon) et contre les mots déjà proposés dans cette
 * génération. Les mots connus sont aussi **exclus dans le prompt** pour que le
 * modèle enchaîne sur les mots SUIVANTS : relancer couvre la tranche par paquets,
 * sans doublon et sans boucle automatique. Le résultat est un **brouillon** :
 * rien n'entre en mémoire sans relecture.
 */
export class GenerateVocabulary {
  public constructor(
    private readonly generator: VocabularyGenerator,
    private readonly drafts: LessonDraftRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  public async execute(input: GenerateVocabularyInput): Promise<GenerateVocabularyResult> {
    const target = clampBatchSize(input.batchSize);

    // Mots déjà connus du domaine (publiés + brouillons) : base de dédup ET
    // liste d'exclusion envoyée au modèle pour qu'il donne les mots suivants.
    const knownRaw = await this.drafts.knownFronts(input.domainId);
    const known = new Set(knownRaw.map(normalizeText));

    const collected: VocabWord[] = [];
    const seen = new Set<string>(); // mots retenus dans CETTE génération
    let duplicatesSkipped = 0;
    let batches = 0;

    while (collected.length < target && batches < MAX_CALLS_PER_REQUEST) {
      const remaining = target - collected.length;
      // Exclut du prompt les mots connus (échantillon borné) + ceux déjà obtenus.
      const exclude = [...knownRaw.slice(-MAX_EXCLUDE_IN_PROMPT), ...collected.map((w) => w.word)];

      const words = await this.generator.generateBatch(input.tranche, remaining, exclude);
      batches += 1;

      let addedThisBatch = 0;
      for (const word of words) {
        const key = normalizeText(word.word);
        if (key === '') {
          continue;
        }
        if (known.has(key) || seen.has(key)) {
          duplicatesSkipped += 1;
          continue;
        }
        seen.add(key);
        collected.push(word);
        addedThisBatch += 1;
        if (collected.length >= target) {
          break;
        }
      }

      // Un paquet qui n'apporte plus AUCUN mot neuf = tranche épuisée (le modèle
      // tourne en rond) → on s'arrête proprement.
      if (addedThisBatch === 0) {
        break;
      }
    }

    if (collected.length === 0) {
      return { draftId: null, requested: target, created: 0, duplicatesSkipped, batches };
    }

    const draftId = await this.persist(input, collected);

    return { draftId, requested: target, created: collected.length, duplicatesSkipped, batches };
  }

  /** Crée le brouillon (cartes riches) via le circuit de relecture existant. */
  private async persist(
    input: GenerateVocabularyInput,
    words: readonly VocabWord[],
  ): Promise<string> {
    const now = this.clock().getTime();
    const draftId = this.newId();

    const draft: DraftRecord = {
      id: draftId,
      createdBy: input.createdBy,
      topic: `Anglais — ${input.tranche.label} (fréquence)`,
      domainId: input.domainId,
      level: input.tranche.level,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    const cards: DraftCardRecord[] = words.map((word, i) => ({
      id: this.newId(),
      draftId,
      front: word.word,
      back: composeBack(word),
      // La « source » d'un mot est la liste de fréquence ; l'« extrait » est
      // l'exemple qui l'illustre (grounding pédagogique, pas une URL web).
      sourceUrl: `Fréquence anglais · rang ${String(input.tranche.start)}–${String(input.tranche.end)}`,
      sourceExtract: `${word.example} — ${word.exampleTranslation}`,
      // Le vocabulaire n'est pas une affirmation factuelle à auditer : « ok ».
      auditVerdict: 'ok',
      auditReason: null,
      status: 'to_review',
      position: i,
      createdAt: now,
    }));

    await this.drafts.createDraft(draft, cards);

    return draftId;
  }
}

/** Compose le verso d'une carte de vocabulaire (sens + catégorie + exemple). */
function composeBack(word: VocabWord): string {
  return [
    `${word.translation} · ${word.category}`,
    '',
    `« ${word.example} »`,
    word.exampleTranslation,
  ].join('\n');
}

/** Borne la taille de paquet dans une plage raisonnable (25–30 par défaut). */
function clampBatchSize(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) {
    return 30;
  }

  return Math.min(40, Math.max(10, Math.trunc(value)));
}
