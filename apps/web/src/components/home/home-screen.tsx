'use client';

import { Mascot } from '@bayt/ui';
import type { ReactElement } from 'react';

import { DEMO_USER_ID } from '@/lib/api/client';
import { usePath } from '@/lib/api/path-queries';
import { useProgress } from '@/lib/api/progress-queries';
import { useDueQueue } from '@/lib/api/queries';

import { ReviewCard } from './review-card';
import { UnitPath } from './unit-path';

/**
 * Accueil de BAYT — point d'entrée de l'app.
 *
 * Carte « Réviser » en évidence, puis le chemin de progression à nœuds, avec la
 * mascotte et un message d'accueil contextuel.
 */
export function HomeScreen(): ReactElement {
  const path = usePath(DEMO_USER_ID);
  const queue = useDueQueue(DEMO_USER_ID);
  const progress = useProgress(DEMO_USER_ID);

  const dueCount = queue.data?.cards.length ?? 0;
  const goalMet = progress.data?.goalMet ?? false;

  return (
    <div className="flex w-full max-w-xl flex-col gap-8">
      <WelcomeMascot dueCount={dueCount} goalMet={goalMet} loading={queue.isPending} />

      <ReviewCard />

      {path.isError ? (
        <PathError onRetry={() => void path.refetch()} />
      ) : path.data === undefined ? (
        <PathSkeleton />
      ) : (
        <div className="flex flex-col gap-10">
          {path.data.units.map((unit) => (
            <UnitPath key={unit.id} unit={unit} />
          ))}
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
        : 'Prêt à avancer sur ton chemin ? Choisis une leçon.';

  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
      <Mascot mood={goalMet ? 'celebrating' : 'idle'} size="md" priority />
      <p className="text-base font-bold leading-relaxed text-muted-foreground">{message}</p>
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
        Impossible de charger le chemin. Vérifie que l&apos;API tourne
        (<code className="font-extrabold">pnpm dev</code>).
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
