'use client';

import { useEffect, useRef, type ReactElement } from 'react';

import type { AnswerResult, ExerciseAnswer, FillBlankExercise } from '@/lib/api/lesson-types';

/**
 * Texte à trous : saisie libre, tolérante aux accents/casse/espaces (la
 * tolérance est appliquée côté domaine, à la correction).
 *
 * Après vérification, le champ passe en vert ou rouge.
 */
export function FillBlankExerciseView({
  exercise,
  text,
  onType,
  locked,
  result,
}: {
  exercise: FillBlankExercise;
  text: string;
  onType: (answer: ExerciseAnswer) => void;
  locked: boolean;
  result: AnswerResult | null;
}): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus automatique à l'arrivée de l'exercice : on peut taper tout de suite.
  useEffect(() => {
    if (!locked) {
      inputRef.current?.focus();
    }
  }, [exercise.id, locked]);

  const state = result === null ? 'idle' : result.correct ? 'correct' : 'wrong';

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="fill-answer" className="sr-only">
        Ta réponse
      </label>
      <input
        id="fill-answer"
        ref={inputRef}
        type="text"
        value={text}
        disabled={locked}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        aria-invalid={state === 'wrong'}
        placeholder="Écris ta réponse…"
        onChange={(event) => {
          onType({ kind: 'fill_blank', text: event.target.value });
        }}
        className={inputClass(state)}
      />
    </div>
  );
}

function inputClass(state: 'idle' | 'correct' | 'wrong'): string {
  const base =
    'w-full rounded-2xl border-2 bg-surface px-4 py-3.5 text-lg font-bold text-foreground outline-none transition-colors placeholder:font-semibold placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-80';

  if (state === 'correct') {
    return `${base} border-feather-green text-feather-green`;
  }
  if (state === 'wrong') {
    return `${base} border-cardinal text-cardinal`;
  }

  return `${base} border-border focus:border-macaw`;
}
