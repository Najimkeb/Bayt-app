'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { useSession } from '@/lib/auth/client';

/**
 * Accès au profil depuis l'en-tête : un avatar (initiale du nom) qui mène à
 * `/profil`. Ne s'affiche qu'une fois connecté.
 */
export function ProfileLink(): ReactElement | null {
  const { data: session } = useSession();

  if (session === null || session === undefined) {
    return null;
  }

  const name = session.user.name;
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Link
      href="/profil"
      aria-label={`Profil de ${name}`}
      title="Profil"
      className="inline-flex size-11 items-center justify-center rounded-full bg-surface-hover text-sm font-black text-foreground transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span aria-hidden="true">{initial}</span>
    </Link>
  );
}
