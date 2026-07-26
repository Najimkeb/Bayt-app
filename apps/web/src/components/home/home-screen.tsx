'use client';

import { Mascot, Surface } from '@bayt/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactElement } from 'react';

import type { DomainOverview } from '@/lib/api/domain-types';
import { hasContent } from '@/lib/api/domain-types';
import { useDomains } from '@/lib/api/domain-queries';
import { useProgress } from '@/lib/api/progress-queries';
import { useDueQueue } from '@/lib/api/queries';
import { useUserId } from '@/lib/auth/use-user-id';

import { DomainIcon } from './domain-icon';
import { DomainPath } from './domain-path';
import { DomainSelector } from './domain-selector';
import { ReviewCard } from './review-card';

/**
 * Accueil de BAYT — point d'entrée de l'app.
 *
 * Carte « Réviser » (tous domaines) en évidence, puis un sélecteur de domaine
 * et le chemin de progression du domaine choisi, avec la mascotte et un message
 * d'accueil contextuel.
 */
export function HomeScreen(): ReactElement {
  const userId = useUserId();
  const domains = useDomains(userId);
  const queue = useDueQueue(userId);
  const progress = useProgress(userId);

  const dueCount = queue.data?.cards.length ?? 0;
  const goalMet = progress.data?.goalMet ?? false;

  const list = useMemo(() => domains.data?.domains ?? [], [domains.data]);

  // Domaine sélectionné : par défaut le premier avec du contenu, sinon le
  // premier tout court. Choisi une fois le catalogue chargé, puis piloté par
  // l'apprenant.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId === null && list.length > 0) {
      const first = list.find(hasContent) ?? list[0];
      if (first !== undefined) {
        setSelectedId(first.id);
      }
    }
  }, [list, selectedId]);

  const selected: DomainOverview | null =
    list.find((domain) => domain.id === selectedId) ?? null;

  return (
    <div className="flex w-full max-w-xl flex-col gap-8">
      <WelcomeMascot dueCount={dueCount} goalMet={goalMet} loading={queue.isPending} />

      <ReviewCard />

      <ExplainLink />

      <LibraryLink />

      {domains.isError ? (
        <CatalogError onRetry={() => void domains.refetch()} />
      ) : domains.isPending ? (
        <CatalogSkeleton />
      ) : (
        <div className="flex flex-col gap-6">
          <DomainSelector domains={list} selectedId={selectedId} onSelect={setSelectedId} />
          {selected !== null && <DomainPath userId={userId} domain={selected} />}
        </div>
      )}
    </div>
  );
}

/** Mascotte + message d'accueil selon le contexte. */
function WelcomeMascot({
  dueCount,
  goalMet,
  loading,
}: {
  dueCount: number;
  goalMet: boolean;
  loading: boolean;
}): ReactElement {
  const message = loading
    ? 'Content de te revoir !'
    : goalMet
      ? 'Objectif du jour atteint, bravo ! Continue sur ta lancée.'
      : dueCount > 0
        ? `Tu as ${String(dueCount)} carte${dueCount > 1 ? 's' : ''} à réviser — c'est le meilleur moment pour ancrer.`
        : 'Prêt à avancer sur ton chemin ? Choisis un domaine.';

  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
      <Mascot mood={goalMet ? 'celebrating' : 'idle'} size="md" priority />
      <p className="text-base font-bold leading-relaxed text-muted-foreground">{message}</p>
    </div>
  );
}

/** Accès à la bibliothèque : déposer un document pour générer des cartes. */
/** Accès au mode « Explique à BAYT ». */
function ExplainLink(): ReactElement {
  return (
    <Link
      href="/explique"
      className="rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Surface className="flex items-center gap-4 p-5 transition-colors hover:bg-surface-hover">
        <DomainIcon name="MessageCircle" color="orange" size="lg" />
        <div className="flex min-w-0 flex-col">
          <p className="text-lg font-extrabold">Explique à BAYT</p>
          <p className="text-sm font-bold text-muted-foreground">
            Explique-moi un concept — j&apos;évalue ta compréhension.
          </p>
        </div>
        <span aria-hidden="true" className="ml-auto text-lg text-muted-foreground">
          ›
        </span>
      </Surface>
    </Link>
  );
}

function LibraryLink(): ReactElement {
  return (
    <Link
      href="/library"
      className="rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Surface className="flex items-center gap-4 p-5 transition-colors hover:bg-surface-hover">
        <DomainIcon name="Library" color="blue" size="lg" />
        <div className="flex min-w-0 flex-col">
          <p className="text-lg font-extrabold">Bibliothèque</p>
          <p className="text-sm font-bold text-muted-foreground">
            Dépose un document — j&apos;en fais des cartes à réviser.
          </p>
        </div>
        <span aria-hidden="true" className="ml-auto text-lg text-muted-foreground">
          ›
        </span>
      </Surface>
    </Link>
  );
}

function CatalogSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-32 shrink-0 animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
        ))}
      </div>
      <div className="flex flex-col items-center gap-7">
        <div className="h-12 w-full animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="size-16 animate-pulse rounded-full bg-surface-hover" />
        ))}
      </div>
      <span className="sr-only">Chargement du catalogue.</span>
    </div>
  );
}

function CatalogError({ onRetry }: { onRetry: () => void }): ReactElement {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-6 text-center"
    >
      <p className="text-base font-bold text-muted-foreground">
        Impossible de charger les domaines. Vérifie que l&apos;API tourne (
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
