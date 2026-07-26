'use client';

import { Mascot } from '@bayt/ui';
import { AlertTriangle, CheckCircle2, HelpCircle, Lightbulb } from 'lucide-react';
import type { CSSProperties, ReactElement } from 'react';

import type { ComprehensionVerdict, Evaluation } from '@/lib/api/explanation-types';

/** Libellé + couleur (sémantique) du verdict. Vert = OK, jaune = flou, rouge = faux. */
const VERDICT: Record<ComprehensionVerdict, { label: string; color: string }> = {
  correct: { label: 'Bien compris', color: 'var(--color-feather-green)' },
  incomplete: { label: 'Compréhension partielle', color: 'var(--color-bee)' },
  imprecise: { label: 'À préciser', color: 'var(--color-bee)' },
  erroneous: { label: 'À revoir', color: 'var(--color-cardinal)' },
};

/**
 * Le retour de BAYT sur une explication, à la première personne : score,
 * points forts, lacunes, corrections, questions de relance, reformulation.
 */
export function ExplanationFeedback({ evaluation }: { evaluation: Evaluation }): ReactElement {
  const verdict = VERDICT[evaluation.verdict];

  return (
    <div className="flex flex-col gap-4">
      {/* Score + mascotte */}
      <div className="flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
        <Mascot mood={evaluation.verdict === 'correct' ? 'celebrating' : 'encouraging'} size="md" priority />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tabular-nums" style={{ color: verdict.color } as CSSProperties}>
              {evaluation.score}
            </span>
            <span className="text-sm font-bold text-muted-foreground">/ 100</span>
            <span
              className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-black text-white"
              style={{ backgroundColor: verdict.color } as CSSProperties}
            >
              {verdict.label}
            </span>
          </div>
          <div
            aria-hidden="true"
            className="h-2.5 w-full overflow-hidden rounded-full bg-surface-hover"
          >
            <span
              className="block h-full rounded-full"
              style={{ width: `${String(evaluation.score)}%`, backgroundColor: verdict.color } as CSSProperties}
            />
          </div>
        </div>
      </div>

      {evaluation.strengths.length > 0 && (
        <Block icon={CheckCircle2} color="var(--color-feather-green)" title="Ce que tu as bien compris" items={evaluation.strengths} />
      )}
      {evaluation.gaps.length > 0 && (
        <Block icon={AlertTriangle} color="var(--color-bee)" title="Ce qui manque ou reste flou" items={evaluation.gaps} />
      )}
      {evaluation.corrections.length > 0 && (
        <Block icon={AlertTriangle} color="var(--color-cardinal)" title="À corriger" items={evaluation.corrections} />
      )}
      {evaluation.followUps.length > 0 && (
        <Block icon={HelpCircle} color="var(--color-macaw)" title="Mes questions pour aller plus loin" items={evaluation.followUps} />
      )}

      <div className="flex items-start gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
        <Lightbulb aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-fox-orange" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-extrabold">Comment je le formulerais</p>
          <p className="text-sm font-bold leading-relaxed text-muted-foreground">
            {evaluation.reformulation}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Un bloc de feedback (liste à puces, icône colorée). */
function Block({
  icon: Icon,
  color,
  title,
  items,
}: {
  icon: typeof CheckCircle2;
  color: string;
  title: string;
  items: readonly string[];
}): ReactElement {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
      <p className="flex items-center gap-2 text-sm font-extrabold">
        <Icon aria-hidden="true" className="size-4 shrink-0" style={{ color } as CSSProperties} />
        {title}
      </p>
      <ul className="flex flex-col gap-1.5 pl-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm font-bold text-muted-foreground">
            <span aria-hidden="true" style={{ color } as CSSProperties}>
              •
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
