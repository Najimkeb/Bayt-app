import type {
  DraftCardRecord,
  DraftRecord,
  DraftSummary,
} from '../application/ports/lesson-draft-repository.js';
import { isSensitiveDomain } from '../ingestion/sourced/sensitive-domains.js';

/** Une carte de brouillon exposée à l'admin (source + audit compris). */
export interface DraftCardDto {
  readonly id: string;
  readonly front: string;
  readonly back: string;
  readonly sourceUrl: string;
  readonly sourceExtract: string;
  readonly auditVerdict: DraftCardRecord['auditVerdict'];
  readonly auditReason: string | null;
  readonly status: DraftCardRecord['status'];
}

/** Un brouillon complet, avec ses cartes et le drapeau « domaine sensible ». */
export interface DraftDto {
  readonly id: string;
  readonly topic: string;
  readonly domainId: string;
  readonly level: DraftRecord['level'];
  readonly status: DraftRecord['status'];
  /** Domaine sensible (droit/santé/finance) → avertissement permanent. */
  readonly sensitive: boolean;
  readonly createdAt: string;
  readonly cards: readonly DraftCardDto[];
}

/** Résumé d'un brouillon pour la liste. */
export interface DraftSummaryDto {
  readonly id: string;
  readonly topic: string;
  readonly domainId: string;
  readonly level: DraftRecord['level'];
  readonly status: DraftRecord['status'];
  readonly cardCount: number;
  readonly createdAt: string;
}

export function presentDraftCard(card: DraftCardRecord): DraftCardDto {
  return {
    id: card.id,
    front: card.front,
    back: card.back,
    sourceUrl: card.sourceUrl,
    sourceExtract: card.sourceExtract,
    auditVerdict: card.auditVerdict,
    auditReason: card.auditReason,
    status: card.status,
  };
}

export function presentDraft(draft: DraftRecord, cards: readonly DraftCardRecord[]): DraftDto {
  return {
    id: draft.id,
    topic: draft.topic,
    domainId: draft.domainId,
    level: draft.level,
    status: draft.status,
    sensitive: isSensitiveDomain(draft.domainId),
    createdAt: new Date(draft.createdAt).toISOString(),
    cards: cards.map(presentDraftCard),
  };
}

export function presentDraftSummary(summary: DraftSummary): DraftSummaryDto {
  return {
    id: summary.id,
    topic: summary.topic,
    domainId: summary.domainId,
    level: summary.level,
    status: summary.status,
    cardCount: summary.cardCount,
    createdAt: new Date(summary.createdAt).toISOString(),
  };
}
