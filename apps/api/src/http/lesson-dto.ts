import type { ExerciseType, ReviewGrade } from '@bayt/domain';

import type { SchedulingStateDto } from './dto.js';

/**
 * Contrat HTTP du contexte « Leçon ».
 *
 * Règle d'or : **aucune solution** dans les exercices renvoyés par la lecture
 * d'une leçon (ni `answerIndex`, ni `answer`, ni l'appariement correct). La
 * correction n'arrive qu'en réponse à une soumission.
 */

interface ExerciseBaseDto {
  readonly id: string;
  readonly type: ExerciseType;
  readonly prompt: string;
}

export interface McqExerciseDto extends ExerciseBaseDto {
  readonly type: 'mcq';
  readonly options: readonly string[];
}

export interface FillBlankExerciseDto extends ExerciseBaseDto {
  readonly type: 'fill_blank';
}

export interface MatchingSideDto {
  readonly id: string;
  readonly text: string;
}

export interface MatchingExerciseDto extends ExerciseBaseDto {
  readonly type: 'matching';
  readonly lefts: readonly MatchingSideDto[];
  /** Côtés « droit » **mélangés** : l'ordre ne trahit pas l'appariement. */
  readonly rights: readonly MatchingSideDto[];
}

export type PresentedExercise = McqExerciseDto | FillBlankExerciseDto | MatchingExerciseDto;

export interface LessonDto {
  readonly id: string;
  readonly title: string;
  readonly exercises: readonly PresentedExercise[];
}

/** Correction affichée après une réponse. */
export type CorrectionDto =
  | { readonly type: 'mcq'; readonly answerIndex: number; readonly answerText: string }
  | { readonly type: 'fill_blank'; readonly answer: string }
  | { readonly type: 'matching'; readonly pairs: readonly { left: string; right: string }[] };

export interface ExerciseAnswerResultDto {
  readonly correct: boolean;
  readonly grade: ReviewGrade;
  readonly correction: CorrectionDto;
  readonly scheduling: SchedulingStateDto;
  /** Délai avant le prochain passage FSRS, en millisecondes. */
  readonly intervalMs: number;
}
