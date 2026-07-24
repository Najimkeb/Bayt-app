'use client';

import { Mascot, buttonVariants } from '@bayt/ui';
import Link from 'next/link';
import type { ReactElement } from 'react';

import type { DomainOverview } from '@/lib/api/domain-types';
import { usePath } from '@/lib/api/path-queries';

import { DomainIcon } from './domain-icon';
import { UnitPath } from './unit-path';

/**
 * Panneau du domaine sélectionné : son chemin à nœuds (unités du domaine), ou
 * un état vide chaleureux qui invite à déposer un document dans la Bibliothèque.
 *
 * Un bouton « Réviser ce domaine » apparaît dès qu'il a des cartes dues.
 */
export function DomainPath({
  userId,
  domain,
}: {
  userId: string;
  domain: DomainOverview;
}): ReactElement {
  const path = usePath(userId, domain.id);

  return (
    <section aria-label={`Domaine : ${domain.name}`} className="flex flex-col gap-6">
      <DomainHeader domain={domain} />

      {path.isError ? (
        <PathError onRetry={() => void path.refetch()} />
      ) : path.data === undefined ? (
        <PathSkeleton />
      ) : path.data.units.length === 0 ? (
        <EmptyDomain domain={domain} />
      ) : (
        <div className="flex flex-col gap-10">
          {path.data.units.map((unit) => (
            <UnitPath key={unit.id} unit={unit} color={domain.color} />
          ))}
        </div>
      )}
    </section>
  );
}

/** En-tête du domaine : nom, description, et accès révision s'il y a des cartes dues. */
function DomainHeader({ domain }: { domain: DomainOverview }): ReactElement {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <DomainIcon name={domain.icon} color={domain.color} size="lg" />
        <div className="flex min-w-0 flex-col">
          <h2 className="text-xl font-black leading-tight">{domain.name}</h2>
          <p className="truncate text-sm font-bold text-muted-foreground">{domain.description}</p>
        </div>
      </div>

      {domain.cardsDue > 0 && (
        <Link
          href={`/review?domain=${encodeURIComponent(domain.id)}`}
          aria-label={`Réviser ${String(domain.cardsDue)} carte(s) du domaine ${domain.name}`}
          className={buttonVariants({ variant: 'green', size: 'md' })}
        >
          Réviser ({domain.cardsDue})
        </Link>
      )}
    </div>
  );
}

/** Domaine sans contenu : mascotte encourageante + invitation à la Bibliothèque. */
function EmptyDomain({ domain }: { domain: DomainOverview }): ReactElement {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-8 text-center">
      <Mascot mood="encouraging" size="md" priority />
      <p className="text-lg font-extrabold">Ce domaine est encore vide</p>
      <p className="max-w-sm text-sm font-bold text-muted-foreground">
        Dépose un document — un cours, des notes, un PDF — et j&apos;en fais des cartes rattachées à
        « {domain.name} ». On le remplit ensemble ?
      </p>
      <Link
        href={`/library?domain=${encodeURIComponent(domain.id)}`}
        className={buttonVariants({ variant: 'blue', size: 'md' })}
      >
        Déposer un document
      </Link>
    </div>
  );
}

function PathSkeleton(): ReactElement {
  return (
    <div className="flex flex-col items-center gap-7" aria-busy="true" aria-live="polite">
      <div className="h-12 w-full animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="size-16 animate-pulse rounded-full bg-surface-hover" />
      ))}
      <span className="sr-only">Chargement du chemin.</span>
    </div>
  );
}

function PathError({ onRetry }: { onRetry: () => void }): ReactElement {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-6 text-center"
    >
      <p className="text-base font-bold text-muted-foreground">
        Impossible de charger le chemin. Vérifie que l&apos;API tourne (
        <code className="font-extrabold">pnpm dev</code>).
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
