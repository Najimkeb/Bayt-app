import type { DocumentRecord, LearningItemRecord } from '../ingestion/document.js';

/** Un document tel qu'exposé par l'API (sans le texte extrait interne). */
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

/**
 * Une carte générée, telle qu'exposée pour l'aperçu d'un document.
 *
 * Contrairement aux exercices d'une leçon, l'aperçu d'un document **doit**
 * montrer recto et verso : la carte est le produit fini que l'apprenant vient
 * de créer, pas une question à corriger.
 */
export interface DocumentCardDto {
  readonly id: string;
  readonly front: string;
  readonly back: string;
}

export function presentDocumentCard(item: LearningItemRecord): DocumentCardDto {
  return { id: item.id, front: item.front, back: item.back };
}
