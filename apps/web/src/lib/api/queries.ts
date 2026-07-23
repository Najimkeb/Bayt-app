'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchDueQueue, fetchPreview, submitReview } from './client';
import type { DueQueue, Preview, ReviewGrade, ReviewResult } from './types';

/**
 * Acces aux donnees serveur via TanStack Query.
 *
 * Le cache de la file est la source de verite de la session de revision : une
 * revision retire la carte du cache immediatement (mise a jour optimiste), ce
 * qui rend l'enchainement instantane meme si le Worker met un instant a
 * repondre. En cas d'echec, on restaure l'etat precedent.
 */

export const queryKeys = {
  queue: (userId: string) => ['queue', userId] as const,
  preview: (userId: string, itemId: string) => ['preview', userId, itemId] as const,
};

export function useDueQueue(userId: string) {
  return useQuery({
    queryKey: queryKeys.queue(userId),
    queryFn: () => fetchDueQueue(),
    // Les echeances evoluent cote serveur : on ne garde pas la file trop longtemps.
    staleTime: 30_000,
  });
}

/**
 * Intervalles des 4 boutons pour une carte.
 *
 * Charge seulement quand la reponse est revelee : inutile de solliciter l'API
 * tant que l'apprenant reflechit encore.
 */
export function usePreview(userId: string, itemId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.preview(userId, itemId ?? ''),
    queryFn: () => fetchPreview(itemId as string),
    enabled: enabled && itemId !== null,
    staleTime: 60_000,
  });
}

export function useSubmitReview(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    ReviewResult,
    Error,
    { itemId: string; grade: ReviewGrade },
    { previous: DueQueue | undefined }
  >({
    mutationFn: ({ itemId, grade }) => submitReview(itemId, grade),

    onMutate: async ({ itemId }) => {
      const key = queryKeys.queue(userId);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<DueQueue>(key);

      // La carte notee quitte la file tout de suite : l'UI n'attend pas le reseau.
      if (previous !== undefined) {
        const cards = previous.cards.filter((card) => card.item.id !== itemId);
        queryClient.setQueryData<DueQueue>(key, { ...previous, cards, count: cards.length });
      }

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.queue(userId), context.previous);
      }
    },

    onSettled: (_data, _error, { itemId }) => {
      // Le prochain passage sur cette carte doit repartir d'une projection fraiche.
      queryClient.removeQueries({ queryKey: queryKeys.preview(userId, itemId) });
    },
  });
}

export type { DueQueue, Preview, ReviewGrade, ReviewResult };
