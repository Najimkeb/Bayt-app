import { detectFormat } from '../../ingestion/format.js';
import type { DocumentRecord } from '../../ingestion/document.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { IngestionQueue } from '../ports/ingestion-queue.js';
import type { ObjectStorage } from '../ports/object-storage.js';

/** Un fichier reçu à l'upload. */
export interface UploadedFile {
  readonly userId: string;
  readonly filename: string;
  readonly contentType: string | null;
  readonly bytes: Uint8Array;
}

/**
 * Cas d'usage « je dépose un document ».
 *
 * Chemin critique volontairement court : on stocke le brut dans R2, on crée la
 * ligne document (`pending`), on pousse un message dans la file, et on répond.
 * Toute l'extraction et la génération se font ensuite dans le consumer.
 */
export class SubmitDocument {
  public constructor(
    private readonly documents: DocumentRepository,
    private readonly storage: ObjectStorage,
    private readonly queue: IngestionQueue,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  public async execute(file: UploadedFile): Promise<DocumentRecord> {
    // Lève `UnsupportedFormatError` pour un format non pris en charge.
    const format = detectFormat(file.filename, file.contentType);

    const id = this.newId();
    const r2Key = `documents/${id}/${sanitize(file.filename)}`;
    const now = this.clock().getTime();

    await this.storage.put(r2Key, file.bytes, file.contentType);

    const document: DocumentRecord = {
      id,
      userId: file.userId,
      filename: file.filename,
      contentType: file.contentType,
      format,
      r2Key,
      status: 'pending',
      error: null,
      cardCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.documents.create(document);
    await this.queue.send({ documentId: id });

    return document;
  }
}

/** Nettoie un nom de fichier pour une clé R2 sûre. */
function sanitize(filename: string): string {
  return filename.replace(/[^\w.-]+/g, '_').slice(0, 128) || 'document';
}
