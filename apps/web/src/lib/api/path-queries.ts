'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchPath, markLessonComplete } from './client';
import type { LearningPath } from './path-types';

export const pathKey = (userId: string): readonly string[] => ['path', userId];

/** Chemin de progression de l'apprenant. */
export function usePath(userId: string) {
  return useQuery<LearningPath>({
    queryKey: pathKey(userId),
    queryFn: () => fetchPath(),
    staleTime: 10_000,
  });
}

/**
 * Marque une leçon terminée et met à jour le chemin en cache.
 *
 * Appelé à la fin d'une leçon : la suivante se débloque immédiatement à l'accueil.
 */
export function useCompleteLesson(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<LearningPath, Error, string>({
    mutationFn: (lessonId) => markLessonComplete(lessonId),
    onSuccess: (path) => {
      queryClient.setQueryData<LearningPath>(pathKey(userId), path);
    },
  });
}
