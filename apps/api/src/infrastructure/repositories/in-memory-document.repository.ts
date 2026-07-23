import type {
  DocumentRepository,
  DocumentStatusPatch,
} from '../../application/ports/document-repository.js';
import type { DocumentRecord, LearningItemRecord } from '../../ingestion/document.js';

/** Implémentation en mémoire de la persistance des documents. */
export class InMemoryDocumentRepository implements DocumentRepository {
  readonly #docs = new Map<string, DocumentRecord>();
  readonly #itemsBySource = new Map<string, LearningItemRecord[]>();

  public create(document: DocumentRecord): Promise<void> {
    this.#docs.set(document.id, document);

    return Promise.resolve();
  }

  public findById(id: string): Promise<DocumentRecord | null> {
    return Promise.resolve(this.#docs.get(id) ?? null);
  }

  public list(userId: string): Promise<readonly DocumentRecord[]> {
    const rows = [...this.#docs.values()]
      .filter((doc) => doc.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);

    return Promise.resolve(rows);
  }

  public updateStatus(id: string, patch: DocumentStatusPatch): Promise<void> {
    const doc = this.#docs.get(id);
    if (doc !== undefined) {
      this.#docs.set(id, {
        ...doc,
        status: patch.status,
        error: patch.error ?? null,
        cardCount: patch.cardCount ?? doc.cardCount,
        updatedAt: patch.updatedAt,
      });
    }

    return Promise.resolve();
  }

  public replaceLearningItems(
    sourceRef: string,
    items: readonly LearningItemRecord[],
  ): Promise<void> {
    this.#itemsBySource.set(sourceRef, [...items]);

    return Promise.resolve();
  }

  public delete(id: string, sourceRef: string): Promise<void> {
    this.#docs.delete(id);
    this.#itemsBySource.delete(sourceRef);

    return Promise.resolve();
  }

  public listLearningItems(sourceRef: string): Promise<readonly LearningItemRecord[]> {
    return Promise.resolve(this.itemsForSource(sourceRef));
  }

  /** Cartes générées pour une source, pour les assertions de test. */
  public itemsForSource(sourceRef: string): readonly LearningItemRecord[] {
    return this.#itemsBySource.get(sourceRef) ?? [];
  }
}
