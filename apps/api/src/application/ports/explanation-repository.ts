import type { ComprehensionVerdict, ReviewGrade } from '@bayt/domain';

/**
 * Port de l'**historique des explications** (« Explique à BAYT »).
 *
 * On garde une trace par explication (sujet, score, verdict, note FSRS) pour
 * visualiser la progression sur un concept. `itemId = null` = sujet libre.
 */
export interface ExplanationLogRecord {
  readonly id: string;
  readonly userId: string;
  readonly itemId: string | null;
  readonly topic: string;
  readonly score: number;
  readonly verdict: ComprehensionVerdict;
  /** Note FSRS appliquée (si reliée à une carte), sinon `null`. */
  readonly grade: ReviewGrade | null;
  readonly createdAt: number;
}

export interface ExplanationRepository {
  save(record: ExplanationLogRecord): Promise<void>;

  /** Historique de l'apprenant, du plus récent au plus ancien ; filtrable par carte. */
  listForUser(userId: string, itemId?: string): Promise<readonly ExplanationLogRecord[]>;
}
