import { normalizeText } from '@bayt/domain';

import type {
  VocabularyGenerator,
} from '../../ingestion/vocab/vocabulary-generator.js';
import type { VocabWord } from '../../ingestion/vocab/vocab-schema.js';
import type { FrequencyTranche } from '../../ingestion/vocab/tranches.js';
import { trancheSize } from '../../ingestion/vocab/tranches.js';
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
  /** Mots par appel LLM (paquet raisonnable). Défaut 30. */
  readonly batchSize?: number | undefined;
}

/** Récapitulatif d'une génération (économie de quota : chiffres avant/après). */
export interface GenerateVocabularyResult {
  /** Brouillon créé (`null` si 0 nouveau mot → rien à relire). */
  readonly draftId: string | null;
  /** Mots visés par la tranche. */
  readonly requested: number;
  /** Nouveaux mots réellement ajoutés au brouillon. */
  readonly created: number;
  /** Mots ignorés car déjà connus (dans le domaine) ou déjà proposés. */
  readonly duplicatesSkipped: number;
  /** Nombre d'appels LLM réellement effectués. */
  readonly batches: number;
}

/** Plafond dur du nombre d'appels LLM par génération (garde-fou quota). */
const MAX_BATCHES = 8;

/**
 * Cas d'usage « générer une liste de vocabulaire par tranche de fréquence ».
 *
 * Génère par **paquets** (un appel LLM = un paquet) et enchaîne jusqu'à couvrir
 * la tranche, **jamais en boucle infinie** (plafond `MAX_BATCHES`). Chaque mot
 * est **dédupliqué** (comparaison normalisée) contre les mots déjà présents dans
 * le domaine ET contre les mots déjà proposés dans cette génération. Le résultat
 * est un **brouillon** : rien n'entre en mémoire sans relecture (comme le studio
 * sourcé).
 */
export class GenerateVocabulary {
  public constructor(
    private readonly generator: VocabularyGenerator,
    private readonly drafts: LessonDraftRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  public async execute(input: GenerateVocabularyInput): Promise<GenerateVocabularyResult> {
    const target = trancheSize(input.tranche);
    const batchSize = clampBatchSize(input.batchSize);

    // Base anti-doublon : les mots déjà présents dans le domaine (normalisés).
    const existing = new Set(
      (await this.drafts.existingFronts(input.domainId)).map(normalizeText),
    );

    const collected: VocabWord[] = [];
    const seen = new Set<string>(); // mots retenus dans CETTE génération
    let duplicatesSkipped = 0;
    let batches = 0;

    // Enchaîne des paquets jusqu'à couvrir la tranche, sous le plafond d'appels.
    while (collected.length < target && batches < MAX_BATCHES) {
      const remaining = target - collected.length;
      const count = Math.min(batchSize, remaining);
      const exclude = collected.map((w) => w.word);

      const words = await this.generator.generateBatch(input.tranche, count, exclude);
      batches += 1;

      let addedThisBatch = 0;
      for (const word of words) {
        const key = normalizeText(word.word);
        if (key === '') {
          continue;
        }
        if (existing.has(key) || seen.has(key)) {
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

      // Sécurité anti-boucle : un paquet qui n'apporte plus AUCUN mot neuf
      // (le modèle tourne en rond) arrête la génération proprement.
      if (addedThisBatch === 0) {
        break;
      }
    }

    if (collected.length === 0) {
      return { draftId: null, requested: target, created: 0, duplicatesSkipped, batches };
    }

    const draftId = await this.persist(input, collected);

    return {
      draftId,
      requested: target,
      created: collected.length,
      duplicatesSkipped,
      batches,
    };
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
