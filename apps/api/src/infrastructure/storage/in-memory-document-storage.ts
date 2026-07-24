import type { DocumentStorage } from '../../application/ports/document-storage.js';

/** Stockage du texte extrait en mémoire, pour les tests. */
export class InMemoryDocumentStorage implements DocumentStorage {
  readonly #texts = new Map<string, string>();

  public put(documentId: string, text: string): Promise<void> {
    this.#texts.set(documentId, text);

    return Promise.resolve();
  }

  public get(documentId: string): Promise<string | null> {
    return Promise.resolve(this.#texts.get(documentId) ?? null);
  }

  public delete(documentId: string): Promise<void> {
    this.#texts.delete(documentId);

    return Promise.resolve();
  }
}
