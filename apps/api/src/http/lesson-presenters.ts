import {
  matchingLefts,
  matchingRights,
  type Exercise,
  type Lesson,
  type MatchingSide,
} from '@bayt/domain';

import type { ExerciseAnswerResult } from '../application/use-cases/submit-exercise-answer.js';
import type {
  CorrectionDto,
  ExerciseAnswerResultDto,
  LessonDto,
  PresentedExercise,
} from './lesson-dto.js';

/**
 * Présentation des leçons vers le client.
 *
 * Retire toute solution des exercices lus, et mélange les côtés « droit » d'une
 * association pour que l'ordre ne trahisse pas l'appariement.
 */

/** Mélange une copie du tableau (Fisher-Yates). Présentation uniquement. */
function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }

  return copy;
}

/** Un exercice sans sa solution, prêt à être joué. */
export function presentExercise(exercise: Exercise): PresentedExercise {
  const base = { id: exercise.id, prompt: exercise.prompt } as const;

  switch (exercise.type) {
    case 'mcq':
      return { ...base, type: 'mcq', options: exercise.options };
    case 'fill_blank':
      return { ...base, type: 'fill_blank' };
    case 'matching':
      return {
        ...base,
        type: 'matching',
        lefts: matchingLefts(exercise).map(toSideDto),
        rights: shuffled(matchingRights(exercise)).map(toSideDto),
      };
  }
}

export function presentLesson(lesson: Lesson): LessonDto {
  return {
    id: lesson.id,
    title: lesson.title,
    exercises: lesson.exercises.map(presentExercise),
  };
}

/** Correction d'un exercice, à afficher après la réponse. */
export function presentCorrection(exercise: Exercise): CorrectionDto {
  switch (exercise.type) {
    case 'mcq':
      return {
        type: 'mcq',
        answerIndex: exercise.answerIndex,
        answerText: exercise.options[exercise.answerIndex] ?? '',
      };
    case 'fill_blank':
      return { type: 'fill_blank', answer: exercise.answer };
    case 'matching':
      return {
        type: 'matching',
        pairs: exercise.pairs.map((pair) => ({ left: pair.left, right: pair.right })),
      };
  }
}

export function presentAnswerResult(result: ExerciseAnswerResult): ExerciseAnswerResultDto {
  const { state } = result.review;

  return {
    correct: result.correct,
    grade: result.grade,
    correction: presentCorrection(result.exercise),
    scheduling: {
      state: state.state,
      stability: state.memory.stability,
      difficulty: state.memory.difficulty,
      due: state.due.toISOString(),
      lastReviewedAt: state.lastReviewedAt?.toISOString() ?? null,
      reps: state.reps,
      lapses: state.lapses,
    },
    intervalMs: state.due.getTime() - (state.lastReviewedAt?.getTime() ?? state.due.getTime()),
  };
}

function toSideDto(side: MatchingSide): { id: string; text: string } {
  return { id: side.id, text: side.text };
}
