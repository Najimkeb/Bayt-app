'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  domainKeyOf,
  enqueuePending,
  loadSnapshot,
  pendingItemIds,
  saveSnapshot,
} from '@/lib/offline/db';
import { localPreview, localReview } from '@/lib/offline/local-review';

import { fetchDueQueue, fetchPreview, replayReviews } from './client';
import type { DueCard, DueQueue, Preview, ReviewGrade, ReviewResult } from './types';

/**
 * Accès aux données de révision — **résilient au hors-ligne**.
 *
 * Principe : le moteur FSRS pur tourne côté client, donc chaque note produit
 * immédiatement un résultat local (affichage instantané) ET un log horodaté à
 * id client unique. Ce log est **toujours** envoyé au serveur par le chemin
 * idempotent (`/reviews/replay`) : en ligne tout de suite, hors-ligne mis en
 * file. Un même log n'est donc jamais appliqué deux fois — priorité absolue :
 * ne pas perdre ni corrompre une révision.
 */

export const queryKeys = {
  /** Clé de la file — scoping par domaine (`'all'` = tous domaines confondus). */
  queue: (userId: string, domainId?: string) => ['queue', userId, domainId ?? 'all'] as const,
  preview: (userId: string, itemId: string) => ['preview', userId, itemId] as const,
};

/** Charge la file : en ligne (et met en cache), sinon depuis le cache local. */
async function loadQueue(domainId?: string): Promise<DueQueue> {
  const domainKey = domainKeyOf(domainId);
  const online = typeof navigator === 'undefined' || navigator.onLine;

  let fetchError: unknown = null;
  if (online) {
    try {
      const queue = await fetchDueQueue(20, domainId);
      await saveSnapshot(domainKey, queue);

      return queue;
    } catch (error) {
      fetchError = error; // réseau/serveur indisponible → on tente le cache local.
    }
  }

  const snapshot = await loadSnapshot(domainKey);
  if (snapshot === null) {
    // Pas de cache : si on a tenté et échoué, on remonte l'erreur (API injoignable) ;
    // sinon (hors-ligne, jamais mis en cache) il n'y a simplement rien à réviser.
    if (fetchError !== null) {
      throw fetchError;
    }

    return { now: new Date().toISOString(), count: 0, cards: [] };
  }

  // Retire les cartes déjà révisées hors-ligne (en attente de synchro).
  const reviewed = await pendingItemIds();
  const cards = snapshot.cards.filter((card) => !reviewed.has(card.item.id));

  return { ...snapshot, cards, count: cards.length };
}

export function useDueQueue(userId: string, domainId?: string) {
  return useQuery({
    queryKey: queryKeys.queue(userId, domainId),
    queryFn: () => loadQueue(domainId),
    staleTime: 30_000,
  });
}

/**
 * Intervalles des 4 boutons pour une carte. Calculés **localement** (même moteur
 * que le serveur) quand le réseau manque ; sinon projetés par l'API.
 */
export function usePreview(userId: string, card: DueCard | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.preview(userId, card?.item.id ?? ''),
    queryFn: async (): Promise<Preview> => {
      if (card === null) {
        throw new Error('carte absente');
      }
      if (typeof navigator === 'undefined' || navigator.onLine) {
        try {
          return await fetchPreview(card.item.id);
        } catch {
          // Repli local.
        }
      }

      return localPreview(card, new Date());
    },
    enabled: enabled && card !== null,
    staleTime: 60_000,
  });
}

export function useSubmitReview(userId: string, domainId?: string) {
  const queryClient = useQueryClient();

  return useMutation<
    ReviewResult,
    Error,
    { card: DueCard; grade: ReviewGrade },
    { previous: DueQueue | undefined }
  >({
    // Résultat FSRS calculé localement (affichage instantané), log envoyé au
    // serveur par le chemin idempotent : immédiatement en ligne, mis en file
    // sinon. On persiste TOUJOURS avant l'envoi → aucune perte possible.
    mutationFn: async ({ card, grade }) => {
      const { result, entry } = localReview(card, grade, new Date());

      if (typeof navigator === 'undefined' || navigator.onLine) {
        try {
          await replayReviews([
            {
              clientId: entry.clientId,
              itemId: entry.itemId,
              grade: entry.grade,
              reviewedAt: entry.reviewedAt,
            },
          ]);

          return result;
        } catch {
          // Réseau finalement indisponible : on bascule en file (idempotent).
        }
      }

      await enqueuePending(entry);

      return result;
    },

    onMutate: async ({ card }) => {
      const key = queryKeys.queue(userId, domainId);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<DueQueue>(key);

      // La carte notée quitte la file tout de suite : l'UI n'attend pas le réseau.
      if (previous !== undefined) {
        const cards = previous.cards.filter((c) => c.item.id !== card.item.id);
        queryClient.setQueryData<DueQueue>(key, { ...previous, cards, count: cards.length });
      }

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.queue(userId, domainId), context.previous);
      }
    },

    onSettled: (_data, _error, { card }) => {
      queryClient.removeQueries({ queryKey: queryKeys.preview(userId, card.item.id) });
    },
  });
}

export type { DueQueue, Preview, ReviewGrade, ReviewResult };
