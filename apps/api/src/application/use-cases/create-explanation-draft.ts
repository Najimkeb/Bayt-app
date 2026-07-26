import type {
  DraftCardRecord,
  DraftRecord,
  LessonDraftRepository,
} from '../ports/lesson-draft-repository.js';

/** Entrée : transformer une explication (sujet libre) en carte à réviser. */
export interface CreateExplanationDraftInput {
  readonly userId: string;
  readonly topic: string;
  /** Reformulation de BAYT (verso de la carte). */
  readonly reformulation: string;
  /** Explication de l'apprenant (conservée comme « source » de la carte). */
  readonly explanation: string;
  readonly domainId: string;
}

/**
 * Cas d'usage « faire une carte à partir de mon explication » (sujet libre).
 *
 * Crée un **brouillon** dans le studio existant : la carte n'entre PAS en mémoire
 * tant qu'un admin ne l'a pas validée puis publiée. La « source » de la carte est
 * la propre explication de l'apprenant.
 */
export class CreateExplanationDraft {
  public constructor(
    private readonly drafts: LessonDraftRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  public async execute(input: CreateExplanationDraftInput): Promise<string> {
    const now = this.clock().getTime();
    const draftId = this.newId();

    const draft: DraftRecord = {
      id: draftId,
      createdBy: input.userId,
      topic: input.topic,
      domainId: input.domainId,
      level: 'beginner',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    const card: DraftCardRecord = {
      id: this.newId(),
      draftId,
      front: input.topic,
      back: input.reformulation,
      // La source de cette carte auto-créée est l'explication de l'apprenant.
      sourceUrl: 'https://bayt.app/explique',
      sourceExtract: input.explanation,
      auditVerdict: 'to_verify',
      auditReason: 'Carte issue d’une explication personnelle — à relire.',
      status: 'to_review',
      position: 0,
      createdAt: now,
    };

    await this.drafts.createDraft(draft, [card]);

    return draftId;
  }
}
