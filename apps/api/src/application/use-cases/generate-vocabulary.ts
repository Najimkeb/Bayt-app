import { normalizeText } from '@bayt/domain';

import type { IngestionQueue } from '../ports/ingestion-queue.js';
import type { VocabularyGenerator } from '../../ingestion/vocab/vocabulary-generator.js';
import type { VocabWord } from '../../ingestion/vocab/vocab-schema.js';
import type { FrequencyTranche } from '../../ingestion/vocab/tranches.js';
import type {
  DraftCardRecord,
  DraftRecord,
  LessonDraftRepository,
} from '../ports/lesson-draft-repository.js';

/** Plafond de mots « connus » injectés dans le prompt (anti-bloat). */
const MAX_EXCLUDE_IN_PROMPT = 120;

/**
 * Appels LLM par exécution du consumer, par défaut **1**.
 *
 * Un modèle 70B met ~80 s à rendre un paquet ; on garde **un paquet relisable
 * par job** (~`batchSize` mots neufs). L'exclusion des mots connus dans le prompt
 * fait enchaîner le modèle sur les mots SUIVANTS, si bien qu'un seul appel suffit
 * à progresser dans la tranche. On relance pour la suite (dédup additive → jamais
 * de doublon). Les tests injectent une valeur > 1 pour couvrir la dédup
 * inter-appels.
 */
const DEFAULT_MAX_CALLS = 1;

/** Entrée du lancement d'une génération de vocabulaire. */
export interface StartVocabularyInput {
  readonly tranche: FrequencyTranche;
  readonly domainId: string;
  /** Admin auteur (id de session). */
  readonly createdBy: string;
  /** Nouveaux mots visés par génération (un « paquet » relisable). Défaut 30. */
  readonly batchSize?: number | undefined;
}

/**
 * Cas d'usage « lancer une génération de vocabulaire » (asynchrone).
 *
 * Crée immédiatement un brouillon **vide** en statut `generating`, met le job en
 * file (Cloudflare Queues), et rend la main tout de suite — **jamais de longue
 * requête synchrone** (le modèle 70B est lent ; une génération synchrone
 * dépassait le délai de passerelle). Le consumer fera le travail et finalisera
 * le brouillon. Rien n'entre en mémoire sans relecture.
 */
export class StartVocabularyGeneration {
  public constructor(
    private readonly drafts: LessonDraftRepository,
    private readonly queue: IngestionQueue,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  public async execute(input: StartVocabularyInput): Promise<{ draftId: string }> {
    const now = this.clock().getTime();
    const draftId = this.newId();

    const draft: DraftRecord = {
      id: draftId,
      createdBy: input.createdBy,
      topic: `Anglais — ${input.tranche.label} (fréquence)`,
      domainId: input.domainId,
      level: input.tranche.level,
      status: 'generating',
      error: null,
      createdAt: now,
      updatedAt: now,
    };

    // Brouillon vide d'abord : le consumer le remplira (aucune carte pour l'instant).
    await this.drafts.createDraft(draft, []);
    await this.queue.send({
      kind: 'vocab',
      draftId,
      tranche: input.tranche.id,
      domainId: input.domainId,
      ...(input.batchSize !== undefined ? { batchSize: input.batchSize } : {}),
    });

    return { draftId };
  }
}

/** Entrée d'exécution du consumer de vocabulaire. */
export interface RunVocabularyInput {
  readonly draftId: string;
  readonly tranche: FrequencyTranche;
  readonly domainId: string;
  readonly batchSize?: number | undefined;
}

/** Résultat d'une exécution (journalisation / tests). */
export interface RunVocabularyResult {
  readonly status: 'draft' | 'failed';
  readonly created: number;
  readonly duplicatesSkipped: number;
  readonly batches: number;
}

/**
 * Cas d'usage « exécuter une génération de vocabulaire » (côté consumer Queue).
 *
 * Génère **un paquet** de ~`batchSize` mots NEUFS, dédupliqués (comparaison
 * normalisée) contre les mots déjà connus du domaine (publiés ET en brouillon),
 * puis **finalise** le brouillon existant : `draft` s'il y a des cartes, sinon
 * `failed` avec un motif. **Ne laisse jamais** un brouillon coincé en
 * `generating` (toute erreur → `failed`), comme l'ingestion de documents.
 */
export class RunVocabularyGeneration {
  public constructor(
    private readonly generator: VocabularyGenerator,
    private readonly drafts: LessonDraftRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
    /** Appels LLM max par job (défaut 1 — anti-timeout ; > 1 en test). */
    private readonly maxCalls: number = DEFAULT_MAX_CALLS,
  ) {}

  public async execute(input: RunVocabularyInput): Promise<RunVocabularyResult> {
    const target = clampBatchSize(input.batchSize);

    try {
      const knownRaw = await this.drafts.knownFronts(input.domainId);
      const known = new Set(knownRaw.map(normalizeText));

      const collected: VocabWord[] = [];
      const seen = new Set<string>();
      let duplicatesSkipped = 0;
      let batches = 0;

      while (collected.length < target && batches < this.maxCalls) {
        const remaining = target - collected.length;
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

        if (addedThisBatch === 0) {
          break;
        }
      }

      const now = this.clock().getTime();
      if (collected.length === 0) {
        await this.drafts.completeDraft(
          input.draftId,
          [],
          'failed',
          'Aucun nouveau mot — cette tranche est déjà couverte dans ce domaine.',
          now,
        );

        return { status: 'failed', created: 0, duplicatesSkipped, batches };
      }

      const cards = this.toCards(input, collected, now);
      await this.drafts.completeDraft(input.draftId, cards, 'draft', null, now);

      return { status: 'draft', created: cards.length, duplicatesSkipped, batches };
    } catch (error) {
      // Jamais coincé en `generating` : toute erreur marque le brouillon `failed`.
      const reason = error instanceof Error ? error.message : 'Échec de la génération';
      await this.drafts.completeDraft(input.draftId, [], 'failed', reason, this.clock().getTime());

      return { status: 'failed', created: 0, duplicatesSkipped: 0, batches: 0 };
    }
  }

  private toCards(
    input: RunVocabularyInput,
    words: readonly VocabWord[],
    now: number,
  ): DraftCardRecord[] {
    return words.map((word, i) => ({
      id: this.newId(),
      draftId: input.draftId,
      front: word.word,
      back: composeBack(word),
      sourceUrl: `Fréquence anglais · rang ${String(input.tranche.start)}–${String(input.tranche.end)}`,
      sourceExtract: `${word.example} — ${word.exampleTranslation}`,
      auditVerdict: 'ok',
      auditReason: null,
      status: 'to_review',
      position: i,
      createdAt: now,
    }));
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
