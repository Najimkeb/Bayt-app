import type { ReactElement } from 'react';

/**
 * Anneau de progression vers l'objectif quotidien.
 *
 * Piste discrète + arc coloré (vert quand l'objectif est atteint). Le contenu
 * central (souvent l'XP du jour) est passé en `children`.
 */
export function GoalRing({
  ratio,
  met,
  size = 40,
  children,
}: {
  ratio: number;
  met: boolean;
  size?: number;
  children?: ReactElement | string;
}): ReactElement {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, ratio));
  const offset = circumference * (1 - clamped);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${String(size)} ${String(size)}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={met ? 'var(--color-fox-orange)' : 'var(--color-macaw)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${String(size / 2)} ${String(size / 2)})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out, stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-extrabold tabular-nums">
        {children}
      </div>
    </div>
  );
}
