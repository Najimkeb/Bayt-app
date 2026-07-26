'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createExplanationDraft,
  evaluateExplanation,
  fetchExplanationHistory,
} from './client';
import type { EvaluationResult, ExplanationHistoryEntry } from './explanation-types';

const historyKey = (itemId?: string) => ['explanations', itemId ?? 'all'] as const;

/** Historique des explications (optionnellement pour un concept). */
export function useExplanationHistory(itemId?: string) {
  return useQuery<{ history: ExplanationHistoryEntry[] }>({
    queryKey: historyKey(itemId),
    queryFn: () => fetchExplanationHistory(itemId),
    staleTime: 10_000,
  });
}

/** Soumet une explication à BAYT ; rafraîchit l'historique au succès. */
export function useEvaluateExplanation(itemId?: string) {
  const queryClient = useQueryClient();

  return useMutation<EvaluationResult, Error, { topic: string; explanation: string }>({
    mutationFn: ({ topic, explanation }) =>
      evaluateExplanation({ topic, explanation, ...(itemId !== undefined ? { itemId } : {}) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: historyKey(itemId) }),
  });
}

/** Crée une carte (brouillon) à partir d'une explication de sujet libre. */
export function useCreateExplanationDraft() {
  return useMutation<
    { draftId: string },
    Error,
    { topic: string; reformulation: string; explanation: string }
  >({
    mutationFn: (input) => createExplanationDraft(input),
  });
}
