'use client';

import { useEffect, type ReactElement } from 'react';

import type { AnswerResult, ExerciseAnswer, McqExercise } from '@/lib/api/lesson-types';

/**
 * QCM : une question, plusieurs options, une seule bonne réponse.
 *
 * Sélection au clic/tap ou au clavier (touches 1–9). Après vérification, la
 * bonne option passe en vert et l'option erronée choisie en rouge.
 */
export function McqExerciseView({
  exercise,
  choice,
  onChoose,
  locked,
  result,
}: {
  exercise: McqExercise;
  choice: number | null;
  onChoose: (answer: ExerciseAnswer) => void;
  locked: boolean;
  result: AnswerResult | null;
}): ReactElement {
  const correctIndex =
    result !== null && result.correction.type === 'mcq' ? result.correction.answerIndex : null;

  useEffect(() => {
    if (locked) {
      return;
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const index = Number.parseInt(event.key, 10) - 1;
      if (index >= 0 && index < exercise.options.length) {
        event.preventDefault();
        onChoose({ kind: 'mcq', choice: index });
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [exercise.options.length, locked, onChoose]);

  return (
    <div
      className="flex flex-col gap-3"
      role="radiogroup"
      aria-label="Choisis la bonne réponse"
    >
      {exercise.options.map((option, index) => {
        const selected = choice === index;
        const isCorrect = correctIndex === index;
        const isWrongChoice = locked && selected && !isCorrect;

        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-keyshortcuts={String(index + 1)}
            disabled={locked}
            onClick={() => {
              onChoose({ kind: 'mcq', choice: index });
            }}
            className={optionClass({ selected, isCorrect, isWrongChoice, locked })}
          >
            <kbd
              aria-hidden="true"
              className="grid size-7 shrink-0 place-items-center rounded-lg border-2 border-current/30 text-sm font-extrabold opacity-70"
            >
              {index + 1}
            </kbd>
            <span className="text-left text-base font-bold">{option}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Classe d'une option selon son état (sélection, correction). */
function optionClass({
  selected,
  isCorrect,
  isWrongChoice,
  locked,
}: {
  selected: boolean;
  isCorrect: boolean;
  isWrongChoice: boolean;
  locked: boolean;
}): string {
  const base =
    'flex touch-manipulation items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  if (locked && isCorrect) {
    return `${base} border-feather-green bg-feather-green/10 text-feather-green`;
  }
  if (isWrongChoice) {
    return `${base} border-cardinal bg-cardinal/10 text-cardinal`;
  }
  if (selected) {
    return `${base} border-macaw bg-macaw/10 text-foreground`;
  }

  return `${base} border-border bg-surface text-foreground hover:border-border-strong disabled:opacity-70`;
}
