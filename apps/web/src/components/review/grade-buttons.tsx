'use client';

import type { ReactElement } from 'react';

import { formatInterval, formatIntervalLong } from '@/lib/format-interval';
import type { Outcome, ReviewGrade } from '@/lib/api/types';

/** Libelle francais et classe de couleur de chaque note. */
const GRADES: readonly {
  grade: ReviewGrade;
  label: string;
  hint: string;
  className: string;
}[] = [
  { grade: 'Again', label: 'A revoir', hint: 'Je ne savais pas', className: 'grade-again' },
  { grade: 'Hard', label: 'Difficile', hint: 'Rappel laborieux', className: 'grade-hard' },
  { grade: 'Good', label: 'Correct', hint: 'Rappel correct', className: 'grade-good' },
  { grade: 'Easy', label: 'Facile', hint: 'Immediat', className: 'grade-easy' },
];

/**
 * Les 4 boutons de notation, chacun annonçant l'intervalle reel qui sera
 * applique — intervalle calcule par le domaine, jamais par le front.
 *
 * Chaque bouton porte son raccourci clavier (1 a 4), visible et expose aux
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Noter mon rappel">
      {GRADES.map(({ grade, label, hint, className }, index) => {
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
                : `${label} — ${hint}, prochaine revision dans ${formatIntervalLong(outcome.intervalMs)}`
            }
            className={`grade-button ${className}`}
          >
            <span className="flex items-center gap-1.5 text-sm">
              <kbd
                aria-hidden="true"
                className="rounded-md border border-current/25 px-1.5 py-0.5 text-[0.65rem] font-semibold opacity-70"
              >
                {shortcut}
              </kbd>
              {label}
            </span>

            <span aria-hidden="true" className="text-xs font-medium opacity-80 tabular-nums">
              {interval ?? '···'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
