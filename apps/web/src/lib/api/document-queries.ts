'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteDocument, fetchDocumentCards, fetchDocuments, uploadDocument } from './client';
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
    queryFn: () => fetchDocuments(),
    staleTime: 1_000,
    // Sonde léger, coupé automatiquement dès que rien n'est plus en traitement.
    refetchInterval: (query) => {
      const anyProcessing = query.state.data?.documents.some((doc) => isProcessing(doc.status));

      return anyProcessing ? POLL_INTERVAL_MS : false;
    },
  });
}

/** Un dépôt de document : le fichier et le domaine de rattachement choisi. */
export interface UploadInput {
  readonly file: File;
  /** Domaine choisi au dépôt (`null` = non catégorisé). */
  readonly domainId: string | null;
}

export function useUploadDocument(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<DocumentDto, Error, UploadInput>({
    mutationFn: ({ file, domainId }) => uploadDocument(file, domainId ?? undefined),

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

/**
 * Supprime un document et ses cartes.
 *
 * Retrait optimiste de la liste : la ligne disparaît tout de suite, restaurée
 * en cas d'échec. Utile pour nettoyer les documents en échec.
 */
export function useDeleteDocument(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, { previous: DocumentList | undefined }>({
    mutationFn: (id) => deleteDocument(id),

    onMutate: async (id) => {
      const key = documentKeys.list(userId);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<DocumentList>(key);
      if (previous !== undefined) {
        queryClient.setQueryData<DocumentList>(key, {
          documents: previous.documents.filter((doc) => doc.id !== id),
        });
      }

      return { previous };
    },

    onError: (_error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(documentKeys.list(userId), context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.list(userId) });
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
