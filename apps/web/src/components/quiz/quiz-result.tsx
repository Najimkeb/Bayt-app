'use client';

import { Button, Mascot, type MascotMood } from '@bayt/ui';
import { RotateCcw, Target } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import type { QuizOutcome, QuizQuestion } from '@/lib/api/quiz-types';

/** Humeur de la mascotte selon le score (encourageante, jamais culpabilisante). */
function moodFor(ratio: number): MascotMood {
  if (ratio >= 0.8) {
    return 'celebrating';
  }
  if (ratio >= 0.5) {
    return 'happy';
  }

  return 'encouraging';
}

function messageFor(ratio: number): string {
  if (ratio >= 0.8) {
    return 'Excellent ! Tu maîtrises.';
  }
  if (ratio >= 0.5) {
    return 'Bien joué. Encore quelques cartes à consolider.';
  }

  return 'Bon entraînement. On revoit les cartes ratées ?';
}

/**
 * Écran de résultat : score, correction des erreurs (bonne réponse rappelée),
 * mascotte réactive, et proposition de rejouer ou de revoir les cartes ratées.
 */
export function QuizResult({
  outcomes,
  onReplay,
  onReviewMissed,
}: {
  outcomes: readonly QuizOutcome[];
  onReplay: () => void;
  onReviewMissed: (missed: QuizQuestion[]) => void;
}): ReactElement {
  const total = outcomes.length;
  const score = outcomes.filter((o) => o.correct).length;
  const ratio = total > 0 ? score / total : 0;
  const missed = outcomes.filter((o) => !o.correct).map((o) => o.question);

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-6 text-center">
        <Mascot mood={moodFor(ratio)} size="lg" />
        <p className="text-4xl font-black tabular-nums">
          {score}
          <span className="text-2xl text-muted-foreground">/{total}</span>
        </p>
        <p className="text-base font-bold text-muted-foreground">{messageFor(ratio)}</p>
      </div>

      {missed.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border-2 border-border bg-surface p-5">
          <p className="text-sm font-extrabold">À revoir ({missed.length})</p>
          <ul className="flex flex-col gap-2">
            {missed.map((q) => (
              <li key={q.id} className="flex flex-col gap-0.5 border-l-4 border-cardinal/40 pl-3">
                <span className="text-sm font-bold text-muted-foreground">{q.prompt}</span>
                <span className="text-sm font-extrabold text-feather-green">{q.correctAnswer}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {missed.length > 0 && (
          <Button type="button" variant="brand" size="lg" onClick={() => onReviewMissed(missed)}>
            <Target aria-hidden="true" className="size-5" />
            Revoir les {missed.length} ratée{missed.length > 1 ? 's' : ''}
          </Button>
        )}
        <Button type="button" variant="blue" size="lg" onClick={onReplay}>
          <RotateCcw aria-hidden="true" className="size-5" />
          Rejouer un quiz
        </Button>
        <Link
          href="/"
          className="self-center pt-1 text-sm font-extrabold text-macaw underline underline-offset-2"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
