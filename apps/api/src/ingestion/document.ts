import type { DocumentFormat } from './format.js';

/**
 * Cycle de vie d'un document ingéré :
 * `pending` (en file) → `processing` → `ready` | `failed`.
 */
export const DOCUMENT_STATUSES = ['pending', 'processing', 'ready', 'failed'] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** Un document et son état de traitement. */
export interface DocumentRecord {
  readonly id: string;
  readonly userId: string;
  readonly filename: string;
  readonly contentType: string | null;
  readonly format: DocumentFormat;
  readonly status: DocumentStatus;
  /** Motif d'échec, si `status === 'failed'`. */
  readonly error: string | null;
  /** Nombre de cartes générées, une fois `ready`. */
  readonly cardCount: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Item de mémoire à insérer (carte générée). */
export interface LearningItemRecord {
  readonly id: string;
  readonly type: 'flashcard';
  readonly front: string;
  readonly back: string;
  readonly sourceRef: string;
  readonly createdAt: number;
}
