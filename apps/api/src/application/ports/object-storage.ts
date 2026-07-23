/**
 * Port de stockage d'objets bruts (le document source).
 *
 * Implémenté par R2 en production, en mémoire pour les tests.
 */
export interface ObjectStorage {
  put(key: string, bytes: Uint8Array, contentType?: string | null): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
}
