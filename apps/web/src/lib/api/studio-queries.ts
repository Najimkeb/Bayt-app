'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addDraftCard,
  deleteDraftCard,
  editDraftCard,
  fetchDraft,
  fetchDrafts,
  generateSourcedLesson,
  publishDraft,
  setDraftCardStatus,
} from './client';
import type { DraftCardStatus, DraftDetail, DraftSummary, LessonLevel } from './draft-types';

const draftsKey = ['admin', 'drafts'] as const;
const draftKey = (id: string) => ['admin', 'draft', id] as const;

/** Liste des brouillons. */
export function useDrafts() {
  return useQuery<{ drafts: DraftSummary[] }>({
    queryKey: draftsKey,
    queryFn: () => fetchDrafts(),
    staleTime: 10_000,
    retry: false,
  });
}

/** Un brouillon détaillé. */
export function useDraft(id: string) {
  return useQuery<DraftDetail>({
    queryKey: draftKey(id),
    queryFn: () => fetchDraft(id),
    retry: false,
  });
}

/** Génère un brouillon sourcé. */
export function useGenerateLesson() {
  return useMutation<{ draftId: string }, Error, { topic: string; domainId: string; level: LessonLevel }>({
    mutationFn: (input) => generateSourcedLesson(input),
  });
}

/** Corrige une carte, puis rafraîchit le brouillon. */
export function useEditCard(draftId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, Error, { cardId: string; front: string; back: string }>({
    mutationFn: ({ cardId, front, back }) => editDraftCard(draftId, cardId, { front, back }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: draftKey(draftId) }),
  });
}

/** Change le statut d'une carte, puis rafraîchit. */
export function useSetCardStatus(draftId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, Error, { cardId: string; status: DraftCardStatus }>({
    mutationFn: ({ cardId, status }) => setDraftCardStatus(draftId, cardId, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: draftKey(draftId) }),
  });
}

/** Supprime une carte, puis rafraîchit. */
export function useDeleteCard(draftId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: (cardId) => deleteDraftCard(draftId, cardId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: draftKey(draftId) }),
  });
}

/** Ajoute une carte, puis rafraîchit. */
export function useAddCard(draftId: string) {
  const queryClient = useQueryClient();

  return useMutation<DraftDetail, Error, { front: string; back: string; sourceUrl: string; sourceExtract: string }>({
    mutationFn: (card) => addDraftCard(draftId, card),
    onSuccess: (data) => queryClient.setQueryData(draftKey(draftId), data),
  });
}

/** Publie le brouillon, puis rafraîchit brouillon + liste. */
export function usePublishDraft(draftId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ published: number }, Error, void>({
    mutationFn: () => publishDraft(draftId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: draftKey(draftId) });
      void queryClient.invalidateQueries({ queryKey: draftsKey });
    },
  });
}
