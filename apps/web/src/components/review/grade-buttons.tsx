'use client';

import type { CSSProperties, ReactElement } from 'react';

import { formatInterval, formatIntervalLong } from '@/lib/format-interval';
import type { Outcome, ReviewGrade } from '@/lib/api/types';

/** Configuration d'affichage de chaque note (couleurs Duolingo). */
const GRADES: readonly {
  grade: ReviewGrade;
  label: string;
  hint: string;
  bg: string;
  shadow: string;
  fg: string;
}[] = [
  {
    grade: 'Again',
    label: 'À revoir',
    hint: 'Je ne savais pas',
    bg: 'var(--color-cardinal)',
    shadow: 'var(--color-cardinal-shadow)',
    fg: '#fff',
  },
  {
    grade: 'Hard',
    label: 'Difficile',
    hint: 'Rappel laborieux',
    bg: 'var(--color-bee)',
    shadow: 'var(--color-bee-shadow)',
    fg: '#4b4b4b',
  },
  {
    grade: 'Good',
    label: 'Correct',
    hint: 'Rappel correct',
    bg: 'var(--color-feather-green)',
    shadow: 'var(--color-feather-green-shadow)',
    fg: '#fff',
  },
  {
    grade: 'Easy',
    label: 'Facile',
    hint: 'Immédiat',
    bg: 'var(--color-macaw)',
    shadow: 'var(--color-macaw-shadow)',
    fg: '#fff',
  },
];

/**
 * Les 4 boutons de notation, en style pressable coloré. Chacun annonce
 * l'intervalle réel qui sera appliqué — intervalle calculé par le domaine,
 * jamais par le front.
 *
 * Chaque bouton porte son raccourci clavier (1 à 4), visible et exposé aux
 * technologies d'assistance via `aria-keyshortcuts`.
 */
export function GradeButtons({
  outcomes,
  disabled,
  onGrade,
}: {
  outcomes: readonly Outcome[] | undefined;
  disabled: boolean;
  onGrade: (grade: ReviewGrade) => void;
}): ReactElement {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      role="group"
      aria-label="Noter mon rappel"
    >
      {GRADES.map(({ grade, label, hint, bg, shadow, fg }, index) => {
        const outcome = outcomes?.find((candidate) => candidate.grade === grade);
        const shortcut = String(index + 1);
        const interval = outcome === undefined ? null : formatInterval(outcome.intervalMs);

        return (
          <button
            key={grade}
            type="button"
            disabled={disabled}
            onClick={() => {
              onGrade(grade);
            }}
            aria-keyshortcuts={shortcut}
            aria-label={
              outcome === undefined
                ? `${label} — ${hint}`
                : `${label} — ${hint}, prochaine révision dans ${formatIntervalLong(outcome.intervalMs)}`
            }
            className="pressable flex min-h-[3.25rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-[var(--radius-button)] px-2 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={
              {
                '--btn-bg': bg,
                '--btn-shadow': shadow,
                '--btn-fg': fg,
              } as CSSProperties
            }
          >
            <span className="flex items-center gap-1.5">
              <kbd
                aria-hidden="true"
                className="rounded-md border-2 border-current/25 px-1.5 py-0.5 text-[0.65rem] font-extrabold opacity-70"
              >
                {shortcut}
              </kbd>
              <span className="text-base font-extrabold">{label}</span>
            </span>

            <span
              aria-hidden="true"
              className="text-sm font-bold tabular-nums opacity-90"
            >
              {interval ?? '···'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
