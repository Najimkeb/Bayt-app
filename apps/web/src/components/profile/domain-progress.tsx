'use client';

import type { CSSProperties, ReactElement } from 'react';

import { DomainIcon } from '@/components/home/domain-icon';
import type { DomainMastery } from '@/lib/api/profile-types';
import { paletteFor } from '@/lib/domain-colors';

/** Progression de maîtrise par domaine : cartes ancrées (review) / total. */
export function DomainProgress({
  domains,
}: {
  domains: readonly DomainMastery[];
}): ReactElement {
  return (
    <ul className="flex flex-col gap-3">
      {domains.map((domain) => (
        <DomainRow key={domain.id} domain={domain} />
      ))}
    </ul>
  );
}

function DomainRow({ domain }: { domain: DomainMastery }): ReactElement {
  const { fill } = paletteFor(domain.color);
  const ratio = domain.total === 0 ? 0 : domain.mastered / domain.total;
  const percent = Math.round(ratio * 100);

  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
      <DomainIcon name={domain.icon} color={domain.color} size="md" />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-extrabold">{domain.name}</p>
          <p className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
            {domain.mastered} / {domain.total} maîtrisées
          </p>
        </div>

        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${domain.name} : ${String(percent)}% de cartes maîtrisées`}
          className="h-2.5 w-full overflow-hidden rounded-full bg-surface-hover"
        >
          <span
            className="block h-full rounded-full transition-[width]"
            style={{ width: `${String(percent)}%`, backgroundColor: fill } as CSSProperties}
          />
        </div>
      </div>
    </li>
  );
}
