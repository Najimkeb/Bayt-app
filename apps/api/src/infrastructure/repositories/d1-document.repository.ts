import { desc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  DocumentRepository,
  DocumentStatusPatch,
} from '../../application/ports/document-repository.js';
import type { DocumentRecord, LearningItemRecord } from '../../ingestion/document.js';
import { documents, learningItems } from '../db/schema.js';

type DocumentRow = typeof documents.$inferSelect;

/** Implémentation D1 (via Drizzle) de la persistance des documents. */
export class D1DocumentRepository implements DocumentRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async create(document: DocumentRecord): Promise<void> {
    await this.db.insert(documents).values(document);
  }

  public async findById(id: string): Promise<DocumentRecord | null> {
    const [row] = await this.db.select().from(documents).where(eq(documents.id, id)).limit(1);

    return row === undefined ? null : toRecord(row);
  }

  public async list(userId: string): Promise<readonly DocumentRecord[]> {
    const rows = await this.db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));

    return rows.map(toRecord);
  }

  public async updateStatus(id: string, patch: DocumentStatusPatch): Promise<void> {
    await this.db
      .update(documents)
      .set({
        status: patch.status,
        error: patch.error ?? null,
        ...(patch.cardCount === undefined ? {} : { cardCount: patch.cardCount }),
        updatedAt: patch.updatedAt,
      })
      .where(eq(documents.id, id));
  }

  public async replaceLearningItems(
    sourceRef: string,
    items: readonly LearningItemRecord[],
  ): Promise<void> {
    await this.db.delete(learningItems).where(eq(learningItems.sourceRef, sourceRef));

    if (items.length > 0) {
      await this.db.insert(learningItems).values([...items]);
    }
  }
}

function toRecord(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    userId: row.userId,
    filename: row.filename,
    contentType: row.contentType,
    format: row.format,
    r2Key: row.r2Key,
    status: row.status,
    error: row.error,
    cardCount: row.cardCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
