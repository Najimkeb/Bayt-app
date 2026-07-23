'use client';

import { useEffect, useState, type ReactElement } from 'react';

/**
 * Compteur qui monte de 0 jusqu'à `value` — l'effet « gain d'XP » de Duolingo.
 *
 * Respecte `prefers-reduced-motion` : la valeur finale s'affiche directement.
 */
export function CountUp({
  value,
  durationMs = 900,
  className,
}: {
  value: number;
  durationMs?: number;
  className?: string;
}): ReactElement {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce || value <= 0) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    let start: number | null = null;

    const tick = (timestamp: number): void => {
      start ??= timestamp;
      const progress = Math.min(1, (timestamp - start) / durationMs);
      // Décélération douce (easeOutCubic).
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [value, durationMs]);

  return (
    <span className={className} aria-hidden="true">
      {display}
    </span>
  );
}
