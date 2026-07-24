'use client';

import { useId, type ReactElement } from 'react';

import type { DomainOverview } from '@/lib/api/domain-types';

/**
 * Choix du domaine de rattachement d'un document, au dépôt.
 *
 * Un `<select>` natif : accessible au clavier, au toucher et aux lecteurs
 * d'écran sans code sur-mesure. La valeur vide (`''`) = « sans domaine ».
 */
export function DomainPicker({
  domains,
  value,
  onChange,
  disabled,
}: {
  domains: readonly DomainOverview[];
  /** Domaine choisi (`null` = non catégorisé). */
  value: string | null;
  onChange: (domainId: string | null) => void;
  disabled?: boolean;
}): ReactElement {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-extrabold">
        Rattacher à un domaine
      </label>
      <select
        id={id}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        className="h-12 rounded-[var(--radius-card)] border-2 border-border bg-surface px-3 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">Sans domaine</option>
        {domains.map((domain) => (
          <option key={domain.id} value={domain.id}>
            {domain.name}
          </option>
        ))}
      </select>
    </div>
  );
}
