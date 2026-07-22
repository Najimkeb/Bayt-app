import type { ReviewGrade, SchedulingState } from './types.js';

/**
 * Port de calcul de la planification (pattern port / adaptateur).
 *
 * Le `Scheduler` — qui porte les regles et le vocabulaire de BAYT — ne depend
 * que de ce contrat, exprime uniquement en types du domaine. L'implementation
 * (aujourd'hui FSRS-6 via `ts-fsrs`) est interchangeable et invisible depuis
 * l'exterieur du paquet.
 */
export interface SchedulingEngine {
  /** Etat initial d'une carte jamais revisee, due a `now`. */
  emptyState(now: Date): SchedulingState;

  /** Etat obtenu si l'apprenant note `grade` a l'instant `now`. */
  next(state: SchedulingState, grade: ReviewGrade, now: Date): SchedulingState;

  /** Probabilite de rappel a l'instant `now` (0 a 1). */
  retrievability(state: SchedulingState, now: Date): number;
}
