import type { LearningState, ReviewGrade } from '@bayt/domain';

import type { LearningItemView } from '../application/ports/review-repository.js';

/**
 * Contrat HTTP de l'API BAYT.
 *
 * Represente ce qui traverse le reseau : dates en ISO 8601 (UTC), durees en
 * millisecondes. Les types du domaine ne sont jamais serialises directement.
 */

export interface SchedulingStateDto {
  readonly state: LearningState;
  readonly stability: number;
  readonly difficulty: number;
  readonly due: string;
  readonly lastReviewedAt: string | null;
  readonly reps: number;
  readonly lapses: number;
}

export interface DueCardDto {
  readonly item: LearningItemView;
  readonly scheduling: SchedulingStateDto;
  readonly retrievability: number;
}

export interface DueQueueDto {
  readonly now: string;
  readonly count: number;
  readonly cards: readonly DueCardDto[];
}

/** Issue d'une note, telle qu'affichee sous un bouton de revision. */
export interface OutcomeDto {
  readonly grade: ReviewGrade;
  readonly intervalMs: number;
  readonly due: string;
}

export interface PreviewDto {
  readonly itemId: string;
  readonly now: string;
  readonly outcomes: readonly OutcomeDto[];
}

export interface ReviewResultDto {
  readonly item: LearningItemView;
  readonly scheduling: SchedulingStateDto;
  readonly review: {
    readonly grade: ReviewGrade;
    readonly reviewedAt: string;
    readonly intervalMs: number;
  };
}
