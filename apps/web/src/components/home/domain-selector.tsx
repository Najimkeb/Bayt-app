'use client';

import type { CSSProperties, ReactElement } from 'react';

import type { DomainOverview } from '@/lib/api/domain-types';
import { paletteFor } from '@/lib/domain-colors';

import { DomainIcon } from './domain-icon';

/**
 * Sélecteur de domaine — rangée horizontale de cartes façon Duolingo.
 *
 * Chaque domaine est un bouton focusable (`aria-pressed` porte l'état
 * sélectionné) montrant son icône, son nom, sa progression (leçons terminées /
 * total) et un pastille des cartes dues. La rangée défile horizontalement sur
 * mobile ; la couleur d'accent vient du domaine.
 */
export function DomainSelector({
  domains,
  selectedId,
  onSelect,
}: {
  domains: readonly DomainOverview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}): ReactElement {
  return (
    <div
      role="group"
      aria-label="Choisir un domaine"
      // `overflow-x-auto` rend l'axe vertical clippé : sans padding, le badge de
      // compteur (`-top-1 -right-1`) serait rogné en haut/à droite. Le padding
      // (haut + côtés, prolongé par `-mx-5`) lui laisse la place, y compris sur
      // la première et la dernière carte.
      className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 pt-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {domains.map((domain) => (
        <DomainTab
          key={domain.id}
          domain={domain}
          selected={domain.id === selectedId}
          onSelect={() => onSelect(domain.id)}
        />
      ))}
    </div>
  );
}

function DomainTab({
  domain,
  selected,
  onSelect,
}: {
  domain: DomainOverview;
  selected: boolean;
  onSelect: () => void;
}): ReactElement {
  const { fill } = paletteFor(domain.color);
  const empty = domain.lessonsTotal === 0;

  const progressLabel = empty
    ? 'à remplir'
    : `${String(domain.lessonsCompleted)}/${String(domain.lessonsTotal)} leçons`;

  const style = selected
    ? ({ borderColor: fill, backgroundColor: `${fill}1a` } as CSSProperties)
    : undefined;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${domain.name} — ${progressLabel}${
        domain.cardsDue > 0 ? `, ${String(domain.cardsDue)} carte(s) à réviser` : ''
      }`}
      style={style}
      className={[
        'relative flex w-32 shrink-0 snap-start flex-col items-center gap-1 rounded-[var(--radius-card)]',
        'border-2 px-3 py-3 text-center transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected ? 'font-black' : 'border-border bg-surface hover:bg-surface-hover',
      ].join(' ')}
    >
      {domain.cardsDue > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-cardinal px-1 text-[0.65rem] font-black text-white"
        >
          {domain.cardsDue}
        </span>
      )}

      <DomainIcon name={domain.icon} color={domain.color} size="md" />
      <span className="line-clamp-2 text-xs font-extrabold leading-tight">{domain.name}</span>
      <span className="text-[0.7rem] font-bold text-muted-foreground">{progressLabel}</span>

      {/* Filet d'accent sous l'onglet sélectionné. */}
      {selected && (
        <span
          aria-hidden="true"
          className="mt-1 h-1 w-8 rounded-full"
          style={{ backgroundColor: fill }}
        />
      )}
    </button>
  );
}
