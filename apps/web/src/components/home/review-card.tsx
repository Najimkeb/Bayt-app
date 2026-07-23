'use client';

import { Surface, buttonVariants } from '@bayt/ui';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { useDueQueue } from '@/lib/api/queries';
import { useUserId } from '@/lib/auth/use-user-id';

/**
 * Carte « Réviser » mise en évidence en haut de l'accueil.
 *
 * Montre le nombre de cartes dues maintenant et un bouton vert vers /review.
 * Sans carte due : un état calme, sans bouton criard.
 */
export function ReviewCard(): ReactElement {
  const queue = useDueQueue(useUserId());
  const count = queue.data?.cards.length ?? 0;

  if (queue.isSuccess && count === 0) {
    return (
      <Surface className="flex items-center gap-4 p-5">
        <span aria-hidden="true" className="text-2xl">
          🌙
        </span>
        <div className="flex flex-col">
          <p className="text-base font-extrabold">Rien à réviser</p>
          <p className="text-sm font-bold text-muted-foreground">
            Reviens plus tard, ta mémoire travaille en arrière-plan.
          </p>
        </div>
      </Surface>
    );
  }

  return (
    <Surface className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="text-3xl">
          🗂️
        </span>
        <div className="flex flex-col">
          <p className="text-lg font-extrabold">À réviser maintenant</p>
          <p className="text-sm font-bold text-muted-foreground" aria-live="polite">
            {queue.isPending
              ? 'Chargement…'
              : `${String(count)} carte${count > 1 ? 's' : ''} due${count > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <Link
        href="/review"
        aria-label={`Réviser ${String(count)} carte${count > 1 ? 's' : ''}`}
        className={buttonVariants({ variant: 'green', size: 'lg' })}
      >
        Réviser
      </Link>
    </Surface>
  );
}
