import { desc, eq, inArray } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  DocumentRepository,
  DocumentStatusPatch,
} from '../../application/ports/document-repository.js';
import type { DocumentRecord, LearningItemRecord } from '../../ingestion/document.js';
import { documents, learningItems, reviewLogs, schedulingState } from '../db/schema.js';

type DocumentRow = typeof documents.$inferSelect;

/** Cartes par requête d'insert : 6 colonnes × 16 = 96 paramètres (< 100, limite D1). */
const INSERT_CHUNK_SIZE = 16;

/** Découpe un tableau en tranches de taille `size` (dernière tranche plus courte). */
function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

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
    // D1 plafonne à 100 paramètres liés par requête. Une carte = 6 colonnes, donc
    // 16 cartes/insert (96 paramètres) restent sous la limite. Sans ce
    // découpage, un document produisant plus de 16 cartes échoue à l'insert
    // (« too many SQL variables »). On regroupe la purge et les inserts dans un
    // seul `batch` atomique : l'ancien lot n'est jamais supprimé sans le nouveau.
    const inserts = chunk([...items], INSERT_CHUNK_SIZE).map((rows) =>
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
    r2Key: row.r2Key,
    status: row.status,
    error: row.error,
    cardCount: row.cardCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
