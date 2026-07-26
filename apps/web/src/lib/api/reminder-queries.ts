'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchDueCount,
  fetchReminderSettings,
  saveReminderSettings,
  type ReminderSettings,
} from './client';
import { browserTimezone } from './progress-queries';

/** Clé de cache des réglages de rappel (par apprenant). */
export const reminderKey = (userId: string): readonly string[] => ['reminders', userId];
/** Clé de cache du compteur de cartes dues (badge de navigation). */
export const dueCountKey = (userId: string): readonly string[] => ['due-count', userId];

/** Réglages de rappel de l'apprenant connecté. */
export function useReminderSettings(userId: string) {
  return useQuery<ReminderSettings>({
    queryKey: reminderKey(userId),
    queryFn: () => fetchReminderSettings(browserTimezone()),
    enabled: userId !== '',
    staleTime: 60_000,
  });
}

/** Enregistre les réglages de rappel (le fuseau suit toujours le navigateur). */
export function useSaveReminderSettings(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<ReminderSettings, Error, { enabled: boolean; hour: number }>({
    mutationFn: ({ enabled, hour }) =>
      saveReminderSettings({ enabled, hour, timezone: browserTimezone() }),
    onSuccess: (settings) => {
      queryClient.setQueryData<ReminderSettings>(reminderKey(userId), settings);
    },
  });
}

/**
 * Nombre total de cartes dues — alimente le badge de navigation. Silencieux en
 * cas d'erreur/hors-ligne (le badge disparaît, il n'est pas critique).
 */
export function useDueCount(userId: string) {
  return useQuery<{ count: number }>({
    queryKey: dueCountKey(userId),
    queryFn: () => fetchDueCount(),
    enabled: userId !== '',
    staleTime: 30_000,
    retry: false,
  });
}
