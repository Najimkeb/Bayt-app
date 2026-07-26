import type { ReviewGrade } from '../scheduling/types.js';

/**
 * Jugement de compréhension quand l'apprenant **explique** un concept avec ses
 * mots. Distingue quatre niveaux, du plus sûr au plus fragile.
 */
export type ComprehensionVerdict = 'correct' | 'incomplete' | 'imprecise' | 'erroneous';

export const COMPREHENSION_VERDICTS = [
  'correct',
  'incomplete',
  'imprecise',
  'erroneous',
] as const;

/**
 * Traduit une évaluation d'explication en note FSRS — le **pont** vers la
 * mémoire, sans système parallèle : expliquer, c'est réviser.
 *
 * Règle assumée :
 * - erronée → `Again` (l'oubli/le contresens ramène la carte vite) ;
 * - floue (incomplète ou imprécise) → `Hard` ;
 * - bonne explication → `Good`, ou `Easy` si vraiment maîtrisée (score ≥ 90).
 */
export function gradeForComprehension(verdict: ComprehensionVerdict, score: number): ReviewGrade {
  if (verdict === 'erroneous') {
    return 'Again';
  }
  if (verdict === 'incomplete' || verdict === 'imprecise') {
    return 'Hard';
  }

  return score >= 90 ? 'Easy' : 'Good';
}
