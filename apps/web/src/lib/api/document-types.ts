/**
 * Contrat HTTP du contexte « Knowledge Ingestion », vu du navigateur.
 *
 * Miroir de `apps/api/src/http/document-dto.ts`. Dupliqué volontairement : le
 * front ne dépend pas du code du Worker (cf. `types.ts`).
 */

/** Cycle de vie d'un document ingéré. */
export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed';

/** Formats du modèle d'ingestion (seuls pdf/text/markdown sont extractibles). */
export type DocumentFormat = 'pdf' | 'text' | 'markdown' | 'word' | 'powerpoint';

export interface DocumentDto {
  readonly id: string;
  readonly filename: string;
  readonly format: DocumentFormat;
  readonly status: DocumentStatus;
  /** Motif d'échec, si `status === 'failed'`. */
  readonly error: string | null;
  /** Nombre de cartes générées, une fois `ready`. */
  readonly cardCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DocumentList {
  readonly documents: readonly DocumentDto[];
}

/** Une carte générée (recto/verso) d'un document. */
export interface DocumentCard {
  readonly id: string;
  readonly front: string;
  readonly back: string;
}

export interface DocumentCards {
  readonly documentId: string;
  readonly cards: readonly DocumentCard[];
}

/** Un statut est-il encore en cours de traitement ? Pilote le polling. */
export function isProcessing(status: DocumentStatus): boolean {
  return status === 'pending' || status === 'processing';
}
