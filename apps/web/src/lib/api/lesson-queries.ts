'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import { fetchLesson, submitAnswer } from './client';
import type { AnswerResult, ExerciseAnswer, Lesson } from './lesson-types';

/** Charge une leçon (immuable le temps de la session). */
export function useLesson(lessonId: string) {
  return useQuery<Lesson>({
    queryKey: ['lesson', lessonId],
    queryFn: () => fetchLesson(lessonId),
    staleTime: Infinity,
  });
}

/**
 * Soumet une réponse d'exercice.
 *
 * `userId` ne sert plus qu'à distinguer les caches entre apprenants ; il n'est
 * pas transmis à l'API (le Worker le déduit de la session).
 */
export function useSubmitAnswer(lessonId: string, _userId: string) {
  return useMutation<
    AnswerResult,
    Error,
    { exerciseId: string; answer: ExerciseAnswer; assisted: boolean }
  >({
    mutationFn: ({ exerciseId, answer, assisted }) =>
      submitAnswer({ lessonId, exerciseId, answer, assisted }),
  });
}
