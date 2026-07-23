'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type ReactElement } from 'react';

import { signOut, useSession } from '@/lib/auth/client';

/**
 * Bouton de déconnexion, dans l'en-tête.
 *
 * Ne s'affiche qu'une fois connecté. À la déconnexion : on vide le cache
 * TanStack Query (aucune donnée de l'apprenant précédent ne doit subsister),
 * puis on renvoie vers `/login`.
 */
export function LogoutButton(): ReactElement | null {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  if (session === null) {
    return null;
  }

  async function onLogout(): Promise<void> {
    setPending(true);
    await signOut();
    queryClient.clear();
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void onLogout()}
      disabled={pending}
      aria-label="Se déconnecter"
      className="rounded-full border-2 border-border px-3 py-1.5 text-xs font-extrabold text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:text-sm"
    >
      Déconnexion
    </button>
  );
}
