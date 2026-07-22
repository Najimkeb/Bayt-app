import type { HTMLAttributes, ReactElement } from 'react';

import { cn } from '../lib/cn.js';

/**
 * Surface elevee : la brique visuelle de base de BAYT (cartes, panneaux).
 *
 * Volontairement sobre — l'elevation vient d'une ombre douce et d'une bordure
 * discrete, jamais d'un contraste agressif.
 */
export function Surface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactElement {
  return (
    <div
      className={cn(
        'rounded-3xl border border-border bg-surface shadow-[0_1px_2px_rgba(28,25,23,0.04),0_12px_32px_-12px_rgba(28,25,23,0.12)]',
        className,
      )}
      {...props}
    />
  );
}
