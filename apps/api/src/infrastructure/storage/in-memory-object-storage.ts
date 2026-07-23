import type { ObjectStorage } from '../../application/ports/object-storage.js';

/** Stockage d'objets en mémoire, pour les tests. */
export class InMemoryObjectStorage implements ObjectStorage {
  readonly #objects = new Map<string, Uint8Array>();

  public put(key: string, bytes: Uint8Array): Promise<void> {
    this.#objects.set(key, bytes);

    return Promise.resolve();
  }

  public get(key: string): Promise<Uint8Array | null> {
    return Promise.resolve(this.#objects.get(key) ?? null);
  }

  public delete(key: string): Promise<void> {
    this.#objects.delete(key);

    return Promise.resolve();
  }
}
