/**
 * Contrat HTTP de l'API BAYT, vu du navigateur.
 *
 * Miroir de `apps/api/src/http/dto.ts`. Il est duplique volontairement : le
 * front ne doit pas dependre du code du Worker. Le jour ou un troisieme
 * consommateur apparait, ces types migreront dans un `packages/contracts`.
 */

export type ReviewGrade = 'Again' | 'Hard' | 'Good' | 'Easy';

/** Les 4 notes, dans l'ordre d'affichage (et des raccourcis 1 a 4). */
export const REVIEW_GRADES: readonly ReviewGrade[] = ['Again', 'Hard', 'Good', 'Easy'];

export type LearningState = 'new' | 'learning' | 'review' | 'relearning';

export interface LearningItem {
  readonly id: string;
  readonly type: 'flashcard' | 'cloze' | 'practice_case';
  readonly front: string;
  readonly back: string;
}

export interface SchedulingStateDto {
  readonly state: LearningState;
  readonly stability: number;
  readonly difficulty: number;
  readonly due: string;
  readonly lastReviewedAt: string | null;
  readonly reps: number;
  readonly lapses: number;
  /** Palier d'apprentissage — nécessaire pour rejouer FSRS côté client (hors-ligne). */
  readonly learningStep: number;
}

export interface DueCard {
  readonly item: LearningItem;
  readonly scheduling: SchedulingStateDto;
  readonly retrievability: number;
}

export interface DueQueue {
  readonly now: string;
  readonly count: number;
  readonly cards: readonly DueCard[];
}

export interface Outcome {
  readonly grade: ReviewGrade;
  readonly intervalMs: number;
  readonly due: string;
}

export interface Preview {
  readonly itemId: string;
  readonly now: string;
  readonly outcomes: readonly Outcome[];
}

export interface ReviewResult {
  readonly item: LearningItem;
  readonly scheduling: SchedulingStateDto;
  readonly review: {
    readonly grade: ReviewGrade;
    readonly reviewedAt: string;
    readonly intervalMs: number;
  };
}
