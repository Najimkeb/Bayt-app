'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addAllowedEmail,
  createResetToken,
  fetchAdminUsers,
  fetchAllowedEmails,
  removeAllowedEmail,
  revokeUser,
} from './client';
import type { AdminUser, AllowedEmail, ResetLink } from './admin-types';

const allowedKey = ['admin', 'allowed-emails'] as const;
const usersKey = ['admin', 'users'] as const;

/** Liste blanche d'inscription. */
export function useAllowedEmails() {
  return useQuery<{ emails: AllowedEmail[] }>({
    queryKey: allowedKey,
    queryFn: () => fetchAllowedEmails(),
    staleTime: 10_000,
    retry: false,
  });
}

/** Ajoute un e-mail autorisé (met à jour la liste depuis la réponse). */
export function useAddAllowedEmail() {
  const queryClient = useQueryClient();

  return useMutation<{ emails: AllowedEmail[] }, Error, { email: string; note: string }>({
    mutationFn: ({ email, note }) => addAllowedEmail(email, note),
    onSuccess: (data) => queryClient.setQueryData(allowedKey, data),
  });
}

/** Retire un e-mail autorisé. */
export function useRemoveAllowedEmail() {
  const queryClient = useQueryClient();

  return useMutation<{ emails: AllowedEmail[] }, Error, string>({
    mutationFn: (email) => removeAllowedEmail(email),
    onSuccess: (data) => queryClient.setQueryData(allowedKey, data),
  });
}

/** Comptes inscrits. */
export function useAdminUsers() {
  return useQuery<{ users: AdminUser[] }>({
    queryKey: usersKey,
    queryFn: () => fetchAdminUsers(),
    staleTime: 10_000,
    retry: false,
  });
}

/** Génère un lien de réinitialisation pour un compte. */
export function useCreateResetToken() {
  return useMutation<ResetLink, Error, string>({
    mutationFn: (userId) => createResetToken(userId),
  });
}

/** Révoque l'accès d'un compte, puis rafraîchit la liste. */
export function useRevokeUser() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: (userId) => revokeUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersKey });
      void queryClient.invalidateQueries({ queryKey: allowedKey });
    },
  });
}
