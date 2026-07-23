'use client';

import { useSession } from './client';

/**
 * Identifiant de l'apprenant connecté, pour **namespacer le cache** TanStack
 * Query (jamais envoyé à l'API : le Worker le déduit du cookie de session).
 *
 * Renvoie `''` tant que la session n'est pas résolue. Les écrans protégés ne
 * s'affichent qu'après `AuthGate` (session garantie), donc en pratique la valeur
 * est un id réel au moment où les composants consomment leurs données.
 */
export function useUserId(): string {
  const { data } = useSession();

  return data?.user.id ?? '';
}
