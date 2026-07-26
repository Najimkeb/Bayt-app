'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactElement, type ReactNode } from 'react';

import { SyncProvider } from '@/lib/offline/sync-provider';

/**
 * Contexte client de l'application.
 *
 * Le `QueryClient` est cree dans un `useState` : une instance par montage du
 * navigateur, jamais partagee entre requetes serveur.
 */
export function Providers({ children }: { children: ReactNode }): ReactElement {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Une erreur reseau en local vient presque toujours d'un Worker
            // eteint : on reessaie une fois, puis on le dit clairement.
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SyncProvider>{children}</SyncProvider>
    </QueryClientProvider>
  );
}
