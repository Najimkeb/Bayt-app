'use client';

import { Mascot } from '@bayt/ui';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { LogoutButton } from '@/components/auth/logout-button';
import type { ProfileUser } from '@/lib/api/profile-types';

/** Formate la date d'inscription en « mois année » (français). */
function memberSinceLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
      new Date(iso),
    );
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * En-tête du profil : mascotte, identité (nom, e-mail, date d'inscription),
 * lien admin conditionnel et déconnexion.
 */
export function ProfileHeader({ user }: { user: ProfileUser }): ReactElement {
  return (
    <header className="flex flex-col gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-5 sm:flex-row sm:items-center">
      <Mascot mood="idle" size="lg" priority />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="truncate text-2xl font-black tracking-tight">{user.name}</h1>
        <p className="truncate text-sm font-bold text-muted-foreground">{user.email}</p>
        <p className="text-sm font-bold text-muted-foreground">
          Membre depuis {memberSinceLabel(user.memberSince)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {user.isAdmin && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-surface px-3 py-1.5 text-xs font-extrabold text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          >
            <ShieldCheck aria-hidden="true" className="size-4" />
            Admin
          </Link>
        )}
        <LogoutButton />
      </div>
    </header>
  );
}
