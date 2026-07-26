import type { LearningItemRecord } from '../../ingestion/document.js';
import type { LessonDraftRepository } from '../ports/lesson-draft-repository.js';

/** Résultat d'une publication : combien de cartes sont entrées en mémoire. */
export interface PublishResult {
  readonly published: number;
}

/**
 * Cas d'usage « publier un brouillon ».
 *
 * **Seules les cartes `validated`** deviennent des `learning_items` du domaine
 * cible (`source_ref = 'draft:<id>'`) et entrent dans le circuit FSRS. Les
 * cartes encore « à relire » sont ignorées. Le brouillon passe `published`.
 */
export class PublishLessonDraft {
  public constructor(
    private readonly drafts: LessonDraftRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  public async execute(draftId: string): Promise<PublishResult | null> {
    const found = await this.drafts.findDraft(draftId);
    if (found === null) {
      return null;
    }

    const now = this.clock().getTime();
    const items: LearningItemRecord[] = found.cards
      .filter((card) => card.status === 'validated')
      .map((card) => ({
        id: this.newId(),
        type: 'flashcard',
        front: card.front,
        back: card.back,
        sourceRef: `draft:${draftId}`,
        domainId: found.draft.domainId,
        createdAt: now,
      }));

    await this.drafts.publish(draftId, items, now);

    return { published: items.length };
  }
}
