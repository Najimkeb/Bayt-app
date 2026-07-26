'use client';

import type { CSSProperties, ReactElement } from 'react';

import type { ComprehensionVerdict, ExplanationHistoryEntry } from '@/lib/api/explanation-types';

const VERDICT_COLOR: Record<ComprehensionVerdict, string> = {
  correct: 'var(--color-feather-green)',
  incomplete: 'var(--color-bee)',
  imprecise: 'var(--color-bee)',
  erroneous: 'var(--color-cardinal)',
};

function formatDate(ms: number): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(ms));
  } catch {
    return '';
  }
}

/**
 * Historique des explications — la progression sur un concept dans le temps
 * (sujet, score, date). Tableau lisible, du plus récent au plus ancien.
 */
export function ExplanationHistory({
  entries,
}: {
  entries: readonly ExplanationHistoryEntry[];
}): ReactElement {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-black tracking-tight">Ta progression</h2>
      <ul className="flex flex-col gap-2">
        {entries.map((entry, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-3"
          >
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-black text-white tabular-nums"
              style={{ backgroundColor: VERDICT_COLOR[entry.verdict] } as CSSProperties}
            >
              {entry.score}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-extrabold">{entry.topic}</span>
            <span className="shrink-0 text-xs font-bold text-muted-foreground">
              {formatDate(entry.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
