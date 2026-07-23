'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchProgress, incrementProgress } from './client';
import type { DailyStatus, IncrementResult, XpEvent } from './progress-types';

/** Clé de cache de la progression. */
export const progressKey = (userId: string): readonly string[] => ['progress', userId];

/** Fuseau horaire de l'apprenant, résolu par le navigateur (repli UTC). */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Progression du jour (alimente la barre d'en-tête). */
export function useProgress(userId: string) {
  return useQuery<DailyStatus>({
    queryKey: progressKey(userId),
    queryFn: () => fetchProgress(browserTimezone()),
    // La barre est visible partout, y compris hors session (login) : on ne
    // sollicite l'API que lorsqu'un apprenant est connecté.
    enabled: userId !== '',
    staleTime: 10_000,
  });
}

/**
 * Enregistre un gain d'XP et rafraîchit la barre d'en-tête.
 *
 * Le cache de progression est mis à jour depuis la réponse (pas besoin d'un
 * aller-retour supplémentaire), puis la barre reflète immédiatement le gain.
 */
export function useIncrementProgress(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<IncrementResult, Error, XpEvent>({
    mutationFn: (event) => incrementProgress({ event, timezone: browserTimezone() }),
    onSuccess: (result) => {
      queryClient.setQueryData<DailyStatus>(progressKey(userId), result.status);
    },
  });
}
