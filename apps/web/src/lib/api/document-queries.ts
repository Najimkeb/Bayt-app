'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchDocumentCards, fetchDocuments, uploadDocument } from './client';
import type { DocumentCards, DocumentDto, DocumentList } from './document-types';
import { isProcessing } from './document-types';

/**
 * Accès aux documents ingérés via TanStack Query.
 *
 * Le polling est **auto-limité** : la liste ne se rafraîchit que tant qu'au
 * moins un document est en cours de traitement (`pending`/`processing`), puis
 * s'arrête de lui-même. On ne sonde jamais dans le vide.
 */

export const documentKeys = {
  list: (userId: string) => ['documents', userId] as const,
  cards: (id: string) => ['document-cards', id] as const,
};

/** Intervalle de polling tant qu'un document est en cours (ms). */
const POLL_INTERVAL_MS = 2_000;

export function useDocuments(userId: string) {
  return useQuery<DocumentList>({
    queryKey: documentKeys.list(userId),
    queryFn: () => fetchDocuments(userId),
    staleTime: 1_000,
    // Sonde léger, coupé automatiquement dès que rien n'est plus en traitement.
    refetchInterval: (query) => {
      const anyProcessing = query.state.data?.documents.some((doc) => isProcessing(doc.status));

      return anyProcessing ? POLL_INTERVAL_MS : false;
    },
  });
}

export function useUploadDocument(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<DocumentDto, Error, File>({
    mutationFn: (file) => uploadDocument(userId, file),

    onSuccess: (created) => {
      const key = documentKeys.list(userId);
      const previous = queryClient.getQueryData<DocumentList>(key);
      // Affichage immédiat : le document apparaît en tête avec son statut
      // `pending`, sans attendre un aller-retour de liste. Le polling prendra
      // le relais pour suivre son avancement.
      const documents = [created, ...(previous?.documents ?? []).filter((d) => d.id !== created.id)];
      queryClient.setQueryData<DocumentList>(key, { documents });
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/** Cartes générées d'un document (chargées à l'ouverture de l'aperçu). */
export function useDocumentCards(id: string | null) {
  return useQuery<DocumentCards>({
    queryKey: documentKeys.cards(id ?? ''),
    queryFn: () => fetchDocumentCards(id as string),
    enabled: id !== null,
    staleTime: 60_000,
  });
}
