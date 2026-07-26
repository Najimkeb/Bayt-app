import type { LearningItemRecord } from '../../ingestion/document.js';
import type { AuditVerdict } from '../../ingestion/sourced/card-auditor.js';
import type { LessonLevel } from '../../ingestion/sourced/search-provider.js';

/** Statut de relecture d'une carte de brouillon. */
export type DraftCardStatus = 'to_review' | 'validated';

/** Statut d'un brouillon de leçon. */
export type DraftStatus = 'draft' | 'published';

/** Un brouillon de leçon sourcée. */
export interface DraftRecord {
  readonly id: string;
  readonly createdBy: string;
  readonly topic: string;
  readonly domainId: string;
  readonly level: LessonLevel;
  readonly status: DraftStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Une carte d'un brouillon, avec sa source et son annotation d'audit. */
export interface DraftCardRecord {
  readonly id: string;
  readonly draftId: string;
  readonly front: string;
  readonly back: string;
  readonly sourceUrl: string;
  readonly sourceExtract: string;
  readonly auditVerdict: AuditVerdict;
  readonly auditReason: string | null;
  readonly status: DraftCardStatus;
  readonly position: number;
  readonly createdAt: number;
}

/** Résumé d'un brouillon pour la liste (sans les cartes). */
export interface DraftSummary extends DraftRecord {
  readonly cardCount: number;
}

/**
 * Port de persistance des **brouillons de leçons sourcées** (studio admin).
 *
 * Un brouillon vit à part des `learning_items` : tant qu'il n'est pas publié, il
 * n'entre **jamais** dans le circuit d'apprentissage. À la publication, seules
 * les cartes `validated` deviennent des `learning_items`.
 */
export interface LessonDraftRepository {
  /** Crée un brouillon et ses cartes (atomique). */
  createDraft(draft: DraftRecord, cards: readonly DraftCardRecord[]): Promise<void>;

  /** Brouillons, du plus récent au plus ancien. */
  listDrafts(): Promise<readonly DraftSummary[]>;

  /** Un brouillon avec ses cartes, ou `null`. */
  findDraft(id: string): Promise<{ draft: DraftRecord; cards: readonly DraftCardRecord[] } | null>;

  /** Corrige le recto/verso d'une carte. */
  updateCard(cardId: string, patch: { front: string; back: string }): Promise<void>;

  /** Change le statut de relecture d'une carte. */
  setCardStatus(cardId: string, status: DraftCardStatus): Promise<void>;

  /** Supprime une carte du brouillon. */
  deleteCard(cardId: string): Promise<void>;

  /** Ajoute une carte au brouillon. */
  addCard(card: DraftCardRecord): Promise<void>;

  /**
   * Publie un brouillon : insère les `learning_items` fournis (cartes validées)
   * et passe le brouillon en `published`. Atomique.
   */
  publish(draftId: string, items: readonly LearningItemRecord[], now: number): Promise<void>;

  /**
   * Rectos (`front`) des `learning_items` déjà **publiés** dans un domaine.
   * Base de la déduplication du vocabulaire : on n'ajoute pas un mot déjà connu.
   */
  existingFronts(domainId: string): Promise<readonly string[]>;
}
