'use client';

import { useMutation } from '@tanstack/react-query';

import { fetchQuiz } from './client';
import type { QuizResponse, QuizType } from './quiz-types';

/** Génère un quiz à la demande (bouton « Démarrer »). */
export function useGenerateQuiz() {
  return useMutation<QuizResponse, Error, { domainId?: string; count: number; types: QuizType[] }>({
    mutationFn: (input) => fetchQuiz(input),
  });
}
