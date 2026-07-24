import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type { DocumentStorage } from '../../application/ports/document-storage.js';
import { documents } from '../db/schema.js';

/**
 * Stockage du texte extrait dans D1 (colonne `documents.extracted_text`).
 *
 * Implémentation de transition tant que R2 n'est pas disponible (cf. lessons.md
 * L031). La ligne `documents` existe déjà (créée par le repository) au moment du
 * `put` : on met simplement à jour la colonne dédiée.
 */
export class D1DocumentStorage implements DocumentStorage {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async put(documentId: string, text: string): Promise<void> {
    await this.db
      .update(documents)
      .set({ extractedText: text })
      .where(eq(documents.id, documentId));
  }

  public async get(documentId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ text: documents.extractedText })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    return row?.text ?? null;
  }

  public async delete(documentId: string): Promise<void> {
    await this.db
      .update(documents)
      .set({ extractedText: null })
      .where(eq(documents.id, documentId));
  }
}
