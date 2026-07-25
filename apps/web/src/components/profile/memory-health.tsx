'use client';

import type { CSSProperties, ReactElement } from 'react';

import type { MemoryHealth } from '@/lib/api/profile-types';
import { paletteFor } from '@/lib/domain-colors';

interface Segment {
  readonly key: string;
  readonly label: string;
  readonly hint: string;
  readonly count: number;
  readonly color: string;
}

/**
 * Santé de la mémoire : répartition des cartes par état FSRS.
 *
 * C'est le différenciateur de BAYT — on montre l'ancrage réel : les cartes « en
 * révision » sont celles qui tiennent à long terme. Barre segmentée décorative
 * (`aria-hidden`) + légende chiffrée qui porte l'information.
 */
export function MemoryHealthCard({ health }: { health: MemoryHealth }): ReactElement {
  const segments: Segment[] = [
    { key: 'new', label: 'Nouvelles', hint: 'jamais étudiées', count: health.newCards, color: 'blue' },
    { key: 'learning', label: 'En apprentissage', hint: 'ancrage en cours', count: health.learning, color: 'yellow' },
    { key: 'review', label: 'En révision', hint: 'ancrées à long terme', count: health.review, color: 'green' },
    { key: 'relearning', label: 'À consolider', hint: 'à revoir bientôt', count: health.relearning, color: 'red' },
  ];

  if (health.total === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border-2 border-border bg-surface p-6 text-center">
        <p className="text-sm font-bold text-muted-foreground">
          Aucune carte pour l&apos;instant. Dépose un document dans la Bibliothèque pour commencer à
          bâtir ta mémoire.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
      {/* Barre segmentée — décorative, la légende porte les chiffres. */}
      <div
        aria-hidden="true"
        className="flex h-4 w-full overflow-hidden rounded-full bg-surface-hover"
      >
        {segments.map((segment) =>
          segment.count === 0 ? null : (
            <span
              key={segment.key}
              className="h-full"
              style={
                {
                  width: `${String((segment.count / health.total) * 100)}%`,
                  backgroundColor: paletteFor(segment.color).fill,
                } as CSSProperties
              }
            />
          ),
        )}
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-1 size-3 shrink-0 rounded-full"
              style={{ backgroundColor: paletteFor(segment.color).fill }}
            />
            <div className="flex flex-col">
              <p className="text-sm font-extrabold leading-tight tabular-nums">
                {segment.count.toLocaleString('fr-FR')}{' '}
                <span className="font-bold text-muted-foreground">{segment.label}</span>
              </p>
              <p className="text-[0.7rem] font-bold text-muted-foreground">{segment.hint}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
