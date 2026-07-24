'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchPath, markLessonComplete } from './client';
import { domainsKey } from './domain-queries';
import type { LearningPath } from './path-types';

/** Clé de cache du chemin — scoping par domaine (chaque domaine a son chemin). */
export const pathKey = (userId: string, domainId: string): readonly string[] => [
  'path',
  userId,
  domainId,
];

/** Chemin de progression d'un domaine. Inerte tant qu'aucun domaine n'est choisi. */
export function usePath(userId: string, domainId: string | null) {
  return useQuery<LearningPath>({
    queryKey: pathKey(userId, domainId ?? ''),
    queryFn: () => fetchPath(domainId as string),
    enabled: domainId !== null,
    staleTime: 10_000,
  });
}

/**
 * Marque une leçon terminée puis réinvalide chemin et catalogue.
 *
 * Le chemin étant scoping par domaine, on ne devine pas ici lequel rafraîchir :
 * on invalide tous les chemins en cache (et le catalogue, dont la progression
 * change). La leçon suivante se débloque au prochain rendu de l'accueil.
 */
export function useCompleteLesson(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: (lessonId) => markLessonComplete(lessonId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['path', userId] });
      void queryClient.invalidateQueries({ queryKey: domainsKey(userId) });
    },
  });
}
