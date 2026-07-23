import type { DocumentRecord } from '../ingestion/document.js';

/** Un document tel qu'exposé par l'API (sans la clé R2 interne). */
export interface DocumentDto {
  readonly id: string;
  readonly filename: string;
  readonly format: DocumentRecord['format'];
  readonly status: DocumentRecord['status'];
  readonly error: string | null;
  readonly cardCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function presentDocument(document: DocumentRecord): DocumentDto {
  return {
    id: document.id,
    filename: document.filename,
    format: document.format,
    status: document.status,
    error: document.error,
    cardCount: document.cardCount,
    createdAt: new Date(document.createdAt).toISOString(),
    updatedAt: new Date(document.updatedAt).toISOString(),
  };
}
