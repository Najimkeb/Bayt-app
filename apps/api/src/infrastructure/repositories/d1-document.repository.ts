import { desc, eq, inArray } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  DocumentRepository,
  DocumentStatusPatch,
} from '../../application/ports/document-repository.js';
import type { DocumentRecord, LearningItemRecord } from '../../ingestion/document.js';
import { chunkForInsert } from '../db/chunk.js';
import { documents, learningItems, reviewLogs, schedulingState } from '../db/schema.js';

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
    // D1 plafonne les paramètres liés par requête : on découpe en lots calculés
    // depuis le nombre de colonnes de `learning_items` (cf. `chunkForInsert`),
    // pour ne jamais dépasser la limite — quelle que soit l'évolution du schéma.
    // Purge + inserts dans un `batch` **atomique** : l'ancien lot n'est jamais
    // supprimé sans que le nouveau soit inséré (tout-ou-rien).
    const inserts = chunkForInsert(items, learningItems).map((rows) =>
      this.db.insert(learningItems).values(rows),
    );

    await this.db.batch([
      this.db.delete(learningItems).where(eq(learningItems.sourceRef, sourceRef)),
      ...inserts,
    ]);
  }

  public async delete(id: string, sourceRef: string): Promise<void> {
    // Ids des cartes du document : sous-requête réutilisée pour purger leur
    // état de révision avant de supprimer les cartes elles-mêmes (l'ordre
    // respecte les dépendances entre tables).
    const itemIds = this.db
      .select({ id: learningItems.id })
      .from(learningItems)
      .where(eq(learningItems.sourceRef, sourceRef));

    await this.db.batch([
      this.db.delete(reviewLogs).where(inArray(reviewLogs.itemId, itemIds)),
      this.db.delete(schedulingState).where(inArray(schedulingState.itemId, itemIds)),
      this.db.delete(learningItems).where(eq(learningItems.sourceRef, sourceRef)),
      this.db.delete(documents).where(eq(documents.id, id)),
    ]);
  }

  public async listLearningItems(sourceRef: string): Promise<readonly LearningItemRecord[]> {
    const rows = await this.db
      .select()
      .from(learningItems)
      .where(eq(learningItems.sourceRef, sourceRef))
      .orderBy(learningItems.createdAt);

    return rows.map((row) => ({
      id: row.id,
      type: 'flashcard',
      front: row.front,
      back: row.back,
      sourceRef: row.sourceRef ?? sourceRef,
      domainId: row.domainId,
      createdAt: row.createdAt,
    }));
  }
}

function toRecord(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    userId: row.userId,
    filename: row.filename,
    contentType: row.contentType,
    format: row.format,
    domainId: row.domainId,
    status: row.status,
    error: row.error,
    cardCount: row.cardCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
