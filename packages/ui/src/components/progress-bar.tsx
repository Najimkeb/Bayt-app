import type { ReactElement } from 'react';

import { cn } from '../lib/cn.js';

/**
 * Barre de progression "chunky" arrondie — style Duolingo.
 *
 * Piste grise, remplissage colore aux extremites bien rondes, avec un reflet
 * clair sur le haut du remplissage pour le relief. Accessible : role
 * `progressbar` et valeurs ARIA renseignees.
 */
export interface ProgressBarProps {
  /** Progression, de 0 a 1 (bornee automatiquement). */
  readonly value: number;
  /** Couleur du remplissage. */
  readonly color?: 'green' | 'blue' | 'yellow';
  readonly className?: string;
  /** Etiquette pour les lecteurs d'ecran. */
  readonly label?: string;
}

const FILL_COLOR = {
  green: 'var(--color-feather-green)',
  blue: 'var(--color-macaw)',
  yellow: 'var(--color-bee)',
} as const;

export function ProgressBar({
  value,
  color = 'green',
  className,
  label,
}: ProgressBarProps): ReactElement {
  const ratio = Math.min(1, Math.max(0, value));
  const percent = Math.round(ratio * 100);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      className={cn('h-4 w-full overflow-hidden rounded-full bg-surface-hover', className)}
    >
      <div
        className="relative h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${String(percent)}%`, backgroundColor: FILL_COLOR[color] }}
      >
        {/* Reflet : la petite touche de relief "candy" de Duolingo. */}
        {ratio > 0.04 && (
          <span className="absolute inset-x-1.5 top-1 h-1 rounded-full bg-white/40" />
        )}
      </div>
    </div>
  );
}
