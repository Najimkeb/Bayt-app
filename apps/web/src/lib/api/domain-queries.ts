'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDomains } from './client';
import type { DomainList } from './domain-types';

/** Clé de cache du catalogue (par apprenant : la progression en dépend). */
export const domainsKey = (userId: string): readonly string[] => ['domains', userId];

/** Catalogue des domaines avec la progression de l'apprenant. */
export function useDomains(userId: string) {
  return useQuery<DomainList>({
    queryKey: domainsKey(userId),
    queryFn: () => fetchDomains(),
    staleTime: 10_000,
  });
}
