'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchProfile, setDailyGoal } from './client';
import { browserTimezone, progressKey } from './progress-queries';
import type { DailyStatus } from './progress-types';
import type { ProfileData } from './profile-types';

/** Clé de cache du profil (par apprenant). */
export const profileKey = (userId: string): readonly string[] => ['profile', userId];

/** Profil + statistiques de l'apprenant connecté. */
export function useProfile(userId: string) {
  return useQuery<ProfileData>({
    queryKey: profileKey(userId),
    queryFn: () => fetchProfile(browserTimezone()),
    enabled: userId !== '',
    staleTime: 30_000,
  });
}

/**
 * Change l'objectif quotidien.
 *
 * Met à jour la barre d'en-tête (cache `progress`) depuis la réponse, puis
 * réinvalide le profil pour rafraîchir le panneau de réglages.
 */
export function useSetDailyGoal(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<DailyStatus, Error, number>({
    mutationFn: (dailyGoal) => setDailyGoal(dailyGoal, browserTimezone()),
    onSuccess: (status) => {
      queryClient.setQueryData<DailyStatus>(progressKey(userId), status);
      void queryClient.invalidateQueries({ queryKey: profileKey(userId) });
    },
  });
}
