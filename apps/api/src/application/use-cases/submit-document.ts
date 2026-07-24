import { detectFormat } from '../../ingestion/format.js';
import { extractText } from '../../ingestion/text-extractor.js';
import type { DocumentRecord } from '../../ingestion/document.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { DocumentStorage } from '../ports/document-storage.js';
import type { IngestionQueue } from '../ports/ingestion-queue.js';

/** Un fichier reçu à l'upload. */
export interface UploadedFile {
  readonly userId: string;
  readonly filename: string;
  readonly contentType: string | null;
  readonly bytes: Uint8Array;
  /** Domaine choisi au dépôt (les cartes en héritent). `null` = non catégorisé. */
  readonly domainId: string | null;
}

/**
 * Cas d'usage « je dépose un document ».
 *
 * L'**extraction du texte se fait ici, à la réception** (avant la mise en file) :
 * le texte extrait est stocké via `DocumentStorage` (D1 aujourd'hui), et le
 * message de queue ne transporte que l'`id` — jamais le texte, pour rester sous
 * la limite de taille des messages. Le consumer relira le texte depuis le
 * stockage. Le chemin critique reste court : pas de génération ici.
 *
 * Une extraction qui échoue dès la réception (ex. PDF sans texte) crée un
 * document `failed` avec son motif, sans mise en file — cohérent avec l'échec
 * asynchrone côté consumer.
 */
export class SubmitDocument {
  public constructor(
    private readonly documents: DocumentRepository,
    private readonly storage: DocumentStorage,
    private readonly queue: IngestionQueue,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  public async execute(file: UploadedFile): Promise<DocumentRecord> {
    // Lève `UnsupportedFormatError` pour un format non pris en charge (→ 415).
    const format = detectFormat(file.filename, file.contentType);

    const id = this.newId();
    const now = this.clock().getTime();
    const base = {
      id,
      userId: file.userId,
      filename: file.filename,
      contentType: file.contentType,
      format,
      domainId: file.domainId,
      cardCount: 0,
      createdAt: now,
    } as const;

    let text: string;
    try {
      text = await extractText(file.bytes, format);
    } catch (error) {
      // Extraction impossible dès la réception : document `failed`, pas de file.
      const failed: DocumentRecord = {
        ...base,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        updatedAt: now,
      };
      await this.documents.create(failed);

      return failed;
    }

    const document: DocumentRecord = { ...base, status: 'pending', error: null, updatedAt: now };
    await this.documents.create(document);
    await this.storage.put(id, text);
    await this.queue.send({ documentId: id });

    return document;
  }
}
