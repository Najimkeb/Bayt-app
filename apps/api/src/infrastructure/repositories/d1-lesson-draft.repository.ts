import { and, asc, count, desc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  DraftCardRecord,
  DraftRecord,
  DraftSummary,
  DraftCardStatus,
  LessonDraftRepository,
} from '../../application/ports/lesson-draft-repository.js';
import type { LearningItemRecord } from '../../ingestion/document.js';
import { chunkForInsert } from '../db/chunk.js';
import { draftCards, learningItems, lessonDrafts } from '../db/schema.js';

/** Implémentation D1 (via Drizzle) des brouillons de leçons sourcées. */
export class D1LessonDraftRepository implements LessonDraftRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async createDraft(draft: DraftRecord, cards: readonly DraftCardRecord[]): Promise<void> {
    const inserts =
      cards.length === 0
        ? []
        : chunkForInsert(cards, draftCards).map((rows) => this.db.insert(draftCards).values(rows));

    await this.db.batch([this.db.insert(lessonDrafts).values(draft), ...inserts]);
  }

  public async listDrafts(): Promise<readonly DraftSummary[]> {
    const rows = await this.db
      .select({
        id: lessonDrafts.id,
        createdBy: lessonDrafts.createdBy,
        topic: lessonDrafts.topic,
        domainId: lessonDrafts.domainId,
        level: lessonDrafts.level,
        status: lessonDrafts.status,
        createdAt: lessonDrafts.createdAt,
        updatedAt: lessonDrafts.updatedAt,
        cardCount: count(draftCards.id),
      })
      .from(lessonDrafts)
      .leftJoin(draftCards, eq(draftCards.draftId, lessonDrafts.id))
      .groupBy(lessonDrafts.id)
      .orderBy(desc(lessonDrafts.createdAt));

    return rows;
  }

  public async findDraft(
    id: string,
  ): Promise<{ draft: DraftRecord; cards: readonly DraftCardRecord[] } | null> {
    const [draft] = await this.db
      .select()
      .from(lessonDrafts)
      .where(eq(lessonDrafts.id, id))
      .limit(1);

    if (draft === undefined) {
      return null;
    }

    const cards = await this.db
      .select()
      .from(draftCards)
      .where(eq(draftCards.draftId, id))
      .orderBy(asc(draftCards.position));

    return { draft, cards };
  }

  public async updateCard(cardId: string, patch: { front: string; back: string }): Promise<void> {
    await this.db
      .update(draftCards)
      .set({ front: patch.front, back: patch.back })
      .where(eq(draftCards.id, cardId));
  }

  public async setCardStatus(cardId: string, status: DraftCardStatus): Promise<void> {
    await this.db.update(draftCards).set({ status }).where(eq(draftCards.id, cardId));
  }

  public async deleteCard(cardId: string): Promise<void> {
    await this.db.delete(draftCards).where(eq(draftCards.id, cardId));
  }

  public async addCard(card: DraftCardRecord): Promise<void> {
    await this.db.insert(draftCards).values(card);
  }

  public async knownFronts(domainId: string): Promise<readonly string[]> {
    // Mots déjà publiés dans le domaine.
    const published = await this.db
      .select({ front: learningItems.front })
      .from(learningItems)
      .where(eq(learningItems.domainId, domainId));

    // Mots encore en brouillon (non publié) du même domaine → dédup additive.
    const drafted = await this.db
      .select({ front: draftCards.front })
      .from(draftCards)
      .innerJoin(lessonDrafts, eq(draftCards.draftId, lessonDrafts.id))
      .where(and(eq(lessonDrafts.domainId, domainId), eq(lessonDrafts.status, 'draft')));

    return [...published.map((r) => r.front), ...drafted.map((r) => r.front)];
  }

  public async publish(
    draftId: string,
    items: readonly LearningItemRecord[],
    now: number,
  ): Promise<void> {
    const inserts =
      items.length === 0
        ? []
        : chunkForInsert(items, learningItems).map((rows) => this.db.insert(learningItems).values(rows));

    await this.db.batch([
      this.db
        .update(lessonDrafts)
        .set({ status: 'published', updatedAt: now })
        .where(eq(lessonDrafts.id, draftId)),
      ...inserts,
    ]);
  }
}
