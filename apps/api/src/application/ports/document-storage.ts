/**
 * Port de stockage du **contenu extrait** d'un document.
 *
 * Aujourd'hui : implémenté par D1 (`documents.extracted_text`), car l'abonnement
 * R2 n'est pas actif (cf. lessons.md L031). Cette interface est la frontière qui
 * permet de rebasculer vers R2 plus tard — en fournissant une implémentation
 * `R2DocumentStorage` — **sans toucher au pipeline** (cas d'usage et routes ne
 * connaissent que ce contrat).
 *
 * On stocke le **texte déjà extrait** (et non les octets bruts) : l'extraction
 * se fait à la réception, hors de ce port.
 */
export interface DocumentStorage {
  /** Enregistre le texte extrait d'un document. */
  put(documentId: string, text: string): Promise<void>;
  /** Relit le texte extrait, ou `null` s'il est absent. */
  get(documentId: string): Promise<string | null>;
  /** Supprime le texte extrait ; ne lève pas si absent. */
  delete(documentId: string): Promise<void>;
}
