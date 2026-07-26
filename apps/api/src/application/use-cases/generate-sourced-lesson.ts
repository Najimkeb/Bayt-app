import type { CardAuditor } from '../../ingestion/sourced/card-auditor.js';
import type { LessonLevel, WebSearchProvider } from '../../ingestion/sourced/search-provider.js';
import type { SourcedCardGenerator } from '../../ingestion/sourced/sourced-card-generator.js';
import type {
  DraftCardRecord,
  DraftRecord,
  LessonDraftRepository,
} from '../ports/lesson-draft-repository.js';

/** La recherche n'a rien trouvé d'exploitable : on n'invente pas de leçon. */
export class NoSourcesError extends Error {
  public constructor() {
    super('Aucune source pertinente trouvée pour ce sujet.');
    this.name = 'NoSourcesError';
  }
}

/** Entrée de génération d'une leçon sourcée. */
export interface GenerateSourcedInput {
  readonly topic: string;
  readonly domainId: string;
  readonly level: LessonLevel;
  /** Admin auteur (id de session). */
  readonly createdBy: string;
}

/**
 * Cas d'usage « générer une leçon sourcée par recherche web ».
 *
 * Recherche web → génération **groundée** (uniquement depuis les sources) →
 * **double passe d'audit** → persistance en **brouillon** (jamais publié
 * automatiquement). Rien n'entre en mémoire sans validation admin ultérieure.
 */
export class GenerateSourcedLesson {
  public constructor(
    private readonly search: WebSearchProvider,
    private readonly generator: SourcedCardGenerator,
    private readonly auditor: CardAuditor,
    private readonly drafts: LessonDraftRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  public async execute(input: GenerateSourcedInput): Promise<string> {
    const docs = await this.search.search(input.topic, input.level);
    if (docs.length === 0) {
      throw new NoSourcesError();
    }

    // Génère strictement à partir des sources (lève si aucune carte groundée).
    const cards = await this.generator.generate(docs, input.level);
    // Double passe : un auditeur critique annote chaque carte.
    const audits = await this.auditor.audit(cards);

    const now = this.clock().getTime();
    const draftId = this.newId();

    const draft: DraftRecord = {
      id: draftId,
      createdBy: input.createdBy,
      topic: input.topic,
      domainId: input.domainId,
      level: input.level,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    const cardRecords: DraftCardRecord[] = cards.map((card, i) => {
      const audit = audits[i] ?? { verdict: 'to_verify' as const, reason: 'Audit indisponible' };

      return {
        id: this.newId(),
        draftId,
        front: card.front,
        back: card.back,
        sourceUrl: card.sourceUrl,
        sourceExtract: card.sourceExtract,
        auditVerdict: audit.verdict,
        auditReason: audit.reason === '' ? null : audit.reason,
        status: 'to_review',
        position: i,
        createdAt: now,
      };
    });

    await this.drafts.createDraft(draft, cardRecords);

    return draftId;
  }
}
