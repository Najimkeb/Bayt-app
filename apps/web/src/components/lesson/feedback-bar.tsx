'use client';

import { Button } from '@bayt/ui';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactElement } from 'react';

import type { AnswerResult } from '@/lib/api/lesson-types';

/**
 * Barre de feedback immédiat, façon Duolingo : verte « Correct ! » ou rouge
 * « Pas tout à fait » avec la bonne réponse, et le bouton « Continuer ».
 */
export function FeedbackBar({
  result,
  onContinue,
}: {
  result: AnswerResult;
  onContinue: () => void;
}): ReactElement {
  const reduceMotion = useReducedMotion();
  const tone = result.correct ? 'correct' : 'wrong';

  return (
    <motion.div
      role="status"
      aria-live="assertive"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col gap-3 rounded-[var(--radius-card)] border-2 p-4 sm:flex-row sm:items-center sm:justify-between ${
        tone === 'correct'
          ? 'border-feather-green bg-feather-green/10'
          : 'border-cardinal bg-cardinal/10'
      }`}
    >
      <div className="flex flex-col gap-0.5">
        <p
          className={`text-lg font-extrabold ${
            tone === 'correct' ? 'text-feather-green' : 'text-cardinal'
          }`}
        >
          {result.correct ? 'Correct !' : 'Pas tout à fait'}
        </p>
        {!result.correct && <CorrectionText result={result} />}
      </div>

      <Button
        variant={result.correct ? 'green' : 'red'}
        onClick={onContinue}
        className="w-full sm:w-auto"
        autoFocus
      >
        Continuer
      </Button>
    </motion.div>
  );
}

/** La bonne réponse, formulée selon le type d'exercice. */
function CorrectionText({ result }: { result: AnswerResult }): ReactElement {
  const { correction } = result;

  if (correction.type === 'mcq') {
    return (
      <p className="text-sm font-bold text-foreground">
        Réponse : <span className="text-feather-green">{correction.answerText}</span>
      </p>
    );
  }

  if (correction.type === 'fill_blank') {
    return (
      <p className="text-sm font-bold text-foreground">
        Réponse : <span className="text-feather-green">{correction.answer}</span>
      </p>
    );
  }

  return (
    <ul className="text-sm font-bold text-foreground">
      {correction.pairs.map((pair) => (
        <li key={pair.left}>
          {pair.left} → <span className="text-feather-green">{pair.right}</span>
        </li>
      ))}
    </ul>
  );
}
