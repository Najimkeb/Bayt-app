/**
 * Contrat HTTP du mode « Explique à BAYT », vu du navigateur.
 *
 * Miroir de l'évaluation renvoyée par l'API. Les textes sont la voix de BAYT
 * (première personne) et sont affichés tels quels.
 */

export type ComprehensionVerdict = 'correct' | 'incomplete' | 'imprecise' | 'erroneous';

export interface Evaluation {
  readonly score: number;
  readonly verdict: ComprehensionVerdict;
  readonly strengths: readonly string[];
  readonly gaps: readonly string[];
  readonly corrections: readonly string[];
  readonly followUps: readonly string[];
  readonly reformulation: string;
}

export interface EvaluationResult {
  readonly evaluation: Evaluation;
  /** Note FSRS déduite (Again/Hard/Good/Easy). */
  readonly grade: string;
  /** Replanification FSRS si reliée à une carte (`null` = sujet libre). */
  readonly review: { readonly intervalMs: number } | null;
}

export interface ExplanationHistoryEntry {
  readonly topic: string;
  readonly score: number;
  readonly verdict: ComprehensionVerdict;
  readonly grade: string | null;
  readonly itemId: string | null;
  readonly createdAt: number;
}
