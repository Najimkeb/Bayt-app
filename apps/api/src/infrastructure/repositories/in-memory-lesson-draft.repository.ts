import type {
  DraftCardRecord,
  DraftCardStatus,
  DraftRecord,
  DraftSummary,
  LessonDraftRepository,
} from '../../application/ports/lesson-draft-repository.js';
import type { LearningItemRecord } from '../../ingestion/document.js';

/** Implémentation en mémoire des brouillons (tests, sans D1). */
export class InMemoryLessonDraftRepository implements LessonDraftRepository {
  readonly #drafts = new Map<string, DraftRecord>();
  readonly #cards = new Map<string, DraftCardRecord>();
  /** learning_items publiés (source_ref → items), pour assertion de test. */
  public readonly published: LearningItemRecord[] = [];

  public createDraft(draft: DraftRecord, cards: readonly DraftCardRecord[]): Promise<void> {
    this.#drafts.set(draft.id, draft);
    for (const card of cards) {
      this.#cards.set(card.id, card);
    }

    return Promise.resolve();
  }

  public listDrafts(): Promise<readonly DraftSummary[]> {
    const summaries = [...this.#drafts.values()]
      .map((draft) => ({
        ...draft,
        cardCount: [...this.#cards.values()].filter((c) => c.draftId === draft.id).length,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);

    return Promise.resolve(summaries);
  }

  public findDraft(
    id: string,
  ): Promise<{ draft: DraftRecord; cards: readonly DraftCardRecord[] } | null> {
    const draft = this.#drafts.get(id);
    if (draft === undefined) {
      return Promise.resolve(null);
    }
    const cards = [...this.#cards.values()]
      .filter((c) => c.draftId === id)
      .sort((a, b) => a.position - b.position);

    return Promise.resolve({ draft, cards });
  }

  public updateCard(cardId: string, patch: { front: string; back: string }): Promise<void> {
    const card = this.#cards.get(cardId);
    if (card !== undefined) {
      this.#cards.set(cardId, { ...card, ...patch });
    }

    return Promise.resolve();
  }

  public setCardStatus(cardId: string, status: DraftCardStatus): Promise<void> {
    const card = this.#cards.get(cardId);
    if (card !== undefined) {
      this.#cards.set(cardId, { ...card, status });
    }

    return Promise.resolve();
  }

  public deleteCard(cardId: string): Promise<void> {
    this.#cards.delete(cardId);

    return Promise.resolve();
  }

  public addCard(card: DraftCardRecord): Promise<void> {
    this.#cards.set(card.id, card);

    return Promise.resolve();
  }

  public publish(draftId: string, items: readonly LearningItemRecord[], now: number): Promise<void> {
    const draft = this.#drafts.get(draftId);
    if (draft !== undefined) {
      this.#drafts.set(draftId, { ...draft, status: 'published', updatedAt: now });
    }
    this.published.push(...items);

    return Promise.resolve();
  }

  public existingFronts(domainId: string): Promise<readonly string[]> {
    return Promise.resolve(
      this.published.filter((item) => item.domainId === domainId).map((item) => item.front),
    );
  }
}
