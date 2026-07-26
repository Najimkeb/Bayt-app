/**
 * Contrat HTTP du studio de leçons sourcées, vu du navigateur.
 *
 * Miroir des DTO `/admin/lessons/*` de l'API. Le grounding (extrait + URL) et
 * l'audit voyagent avec chaque carte pour la relecture.
 */

export type LessonLevel = 'beginner' | 'intermediate' | 'advanced';
export type AuditVerdict = 'ok' | 'to_verify' | 'unsupported';
export type DraftCardStatus = 'to_review' | 'validated';
export type DraftStatus = 'draft' | 'published';

export interface DraftCard {
  readonly id: string;
  readonly front: string;
  readonly back: string;
  readonly sourceUrl: string;
  readonly sourceExtract: string;
  readonly auditVerdict: AuditVerdict;
  readonly auditReason: string | null;
  readonly status: DraftCardStatus;
}

export interface DraftDetail {
  readonly id: string;
  readonly topic: string;
  readonly domainId: string;
  readonly level: LessonLevel;
  readonly status: DraftStatus;
  /** Domaine sensible (droit/santé/finance) → avertissement permanent. */
  readonly sensitive: boolean;
  readonly createdAt: string;
  readonly cards: readonly DraftCard[];
}

export interface DraftSummary {
  readonly id: string;
  readonly topic: string;
  readonly domainId: string;
  readonly level: LessonLevel;
  readonly status: DraftStatus;
  readonly cardCount: number;
  readonly createdAt: string;
}
