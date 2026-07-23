/**
 * Contrat HTTP du contexte « Leçon », vu du navigateur.
 *
 * Miroir de `apps/api/src/http/lesson-dto.ts` (le front ne dépend pas du code du
 * Worker). Les exercices reçus ne contiennent **jamais** leur solution.
 */

import type { ReviewGrade } from './types';

export type ExerciseType = 'mcq' | 'fill_blank' | 'matching';

interface ExerciseBase {
  readonly id: string;
  readonly type: ExerciseType;
  readonly prompt: string;
}

export interface McqExercise extends ExerciseBase {
  readonly type: 'mcq';
  readonly options: readonly string[];
}

export interface FillBlankExercise extends ExerciseBase {
  readonly type: 'fill_blank';
}

export interface MatchingSide {
  readonly id: string;
  readonly text: string;
}

export interface MatchingExercise extends ExerciseBase {
  readonly type: 'matching';
  readonly lefts: readonly MatchingSide[];
  readonly rights: readonly MatchingSide[];
}

export type PresentedExercise = McqExercise | FillBlankExercise | MatchingExercise;

export interface Lesson {
  readonly id: string;
  readonly title: string;
  readonly exercises: readonly PresentedExercise[];
}

// --- Réponses envoyées ----------------------------------------------------

export type ExerciseAnswer =
  | { readonly kind: 'mcq'; readonly choice: number }
  | { readonly kind: 'fill_blank'; readonly text: string }
  | {
      readonly kind: 'matching';
      readonly pairs: readonly { readonly leftId: string; readonly rightId: string }[];
    };

// --- Résultat d'une réponse ----------------------------------------------

export type Correction =
  | { readonly type: 'mcq'; readonly answerIndex: number; readonly answerText: string }
  | { readonly type: 'fill_blank'; readonly answer: string }
  | { readonly type: 'matching'; readonly pairs: readonly { left: string; right: string }[] };

export interface AnswerResult {
  readonly correct: boolean;
  readonly grade: ReviewGrade;
  readonly correction: Correction;
  readonly intervalMs: number;
}
