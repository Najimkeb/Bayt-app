'use client';

import { Mascot } from '@bayt/ui';
import Link from 'next/link';
import { useMemo, type ReactElement } from 'react';

import { useAdminUsers, useAllowedEmails } from '@/lib/api/admin-queries';
import { ApiError } from '@/lib/api/client';

import { AccessPanel } from './access-panel';
import { UsersPanel } from './users-panel';

/** Une erreur de requête est-elle un refus d'accès (403) ? */
function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

/**
 * Panneau d'administration : liste blanche d'inscription et gestion des comptes.
 *
 * L'accès est vérifié **côté serveur** (rôle en base). Si l'API répond 403, on
 * affiche un refus clair plutôt que des données. Le front ne décide rien.
 */
export function AdminScreen(): ReactElement {
  const allowed = useAllowedEmails();
  const users = useAdminUsers();

  const registered = useMemo(
    () => new Set((users.data?.users ?? []).map((u) => u.email.toLowerCase())),
    [users.data],
  );

  if (isForbidden(allowed.error) || isForbidden(users.error)) {
    return <Forbidden />;
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black tracking-tight">Administration</h1>
          <p className="text-sm font-bold text-muted-foreground">
            Accès sur invitation et gestion des comptes.
          </p>
        </div>
        <Link
          href="/profil"
          className="shrink-0 text-sm font-extrabold text-macaw underline underline-offset-2"
        >
          ← Profil
        </Link>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-black tracking-tight">Liste blanche d&apos;inscription</h2>
        {allowed.isError ? (
          <ErrorNote onRetry={() => void allowed.refetch()} />
        ) : allowed.data === undefined ? (
          <PanelSkeleton />
        ) : (
          <AccessPanel emails={allowed.data.emails} registered={registered} />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-black tracking-tight">Comptes inscrits</h2>
        {users.isError ? (
          <ErrorNote onRetry={() => void users.refetch()} />
        ) : users.data === undefined ? (
          <PanelSkeleton />
        ) : (
          <UsersPanel users={users.data.users} />
        )}
      </section>
    </div>
  );
}

/** Refus d'accès : un non-admin n'a rien à voir ici. */
function Forbidden(): ReactElement {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 text-center" role="alert">
      <Mascot mood="idle" size="lg" />
      <h1 className="text-2xl font-extrabold">Accès réservé</h1>
      <p className="text-base font-bold leading-relaxed text-muted-foreground">
        Cette zone est réservée aux administrateurs de BAYT.
      </p>
      <Link href="/" className="text-sm font-extrabold text-macaw underline underline-offset-2">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

function PanelSkeleton(): ReactElement {
  return (
    <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-surface-hover" aria-busy="true">
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

function ErrorNote({ onRetry }: { onRetry: () => void }): ReactElement {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-6 text-center"
    >
      <p className="text-base font-bold text-muted-foreground">
        Impossible de charger ces données. Vérifie que l&apos;API tourne.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-extrabold text-macaw underline underline-offset-2"
      >
        Réessayer
      </button>
    </div>
  );
}
