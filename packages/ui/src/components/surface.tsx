import type { HTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

/**
 * Surface : la brique visuelle de base de BAYT (cartes, panneaux).
 *
 * Style Duolingo : coins bien arrondis, bordure franche de 2 px, fond plat.
 * Le relief vient de la bordure, pas d'une ombre lourde.
 */
export function Surface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border-2 border-border bg-surface',
        className,
      )}
      {...props}
    />
  );
}
