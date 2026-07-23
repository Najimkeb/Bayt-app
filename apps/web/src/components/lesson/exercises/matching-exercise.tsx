'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';

import type {
  AnswerResult,
  ExerciseAnswer,
  MatchingExercise,
  MatchingSide,
} from '@/lib/api/lesson-types';

/**
 * Association : apparier chaque terme (gauche) à sa définition (droite).
 *
 * On sélectionne un terme, puis une définition : la paire reçoit un numéro
 * commun. Réponse complète quand chaque terme est apparié. Après vérification,
 * chaque paire passe en vert (juste) ou rouge (faux).
 */
export function MatchingExerciseView({
  exercise,
  onChange,
  locked,
  result,
}: {
  exercise: MatchingExercise;
  onChange: (answer: ExerciseAnswer | null) => void;
  locked: boolean;
  result: AnswerResult | null;
}): ReactElement {
  // leftId -> rightId
  const [links, setLinks] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  // Réinitialise quand on change d'exercice.
  useEffect(() => {
    setLinks({});
    setSelectedLeft(null);
  }, [exercise.id]);

  // Remonte la réponse (ou null tant qu'incomplète).
  useEffect(() => {
    const pairs = Object.entries(links).map(([leftId, rightId]) => ({ leftId, rightId }));
    onChange(pairs.length === exercise.lefts.length ? { kind: 'matching', pairs } : null);
  }, [links, exercise.lefts.length, onChange]);

  const rightToLeft = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [leftId, rightId] of Object.entries(links)) {
      map[rightId] = leftId;
    }
    return map;
  }, [links]);

  const orderOfLeft = (leftId: string): number =>
    exercise.lefts.findIndex((side) => side.id === leftId);

  function chooseLeft(leftId: string): void {
    if (locked) return;
    setSelectedLeft((current) => (current === leftId ? null : leftId));
  }

  function chooseRight(rightId: string): void {
    if (locked) return;

    if (selectedLeft === null) {
      // Cliquer une définition déjà liée la détache.
      const owner = rightToLeft[rightId];
      if (owner !== undefined) {
        setLinks((prev) => {
          const next = { ...prev };
          delete next[owner];
          return next;
        });
      }
      return;
    }

    setLinks((prev) => {
      const next = { ...prev };
      // Une définition ne sert qu'une fois : on la retire de son ancien terme.
      const previousOwner = Object.keys(next).find((leftId) => next[leftId] === rightId);
      if (previousOwner !== undefined) {
        delete next[previousOwner];
      }
      next[selectedLeft] = rightId;
      return next;
    });
    setSelectedLeft(null);
  }

  /** Correction : le bon texte de droite pour un texte de gauche donné. */
  const correctRightFor = (leftText: string): string | null => {
    if (result === null || result.correction.type !== 'matching') return null;
    return result.correction.pairs.find((pair) => pair.left === leftText)?.right ?? null;
  };

  const rightTextById = (rightId: string): string =>
    exercise.rights.find((side) => side.id === rightId)?.text ?? '';

  return (
    <div className="grid grid-cols-2 gap-3" role="group" aria-label="Associe chaque terme à sa définition">
      <ul className="flex flex-col gap-3" aria-label="Termes">
        {exercise.lefts.map((left) => {
          const rightId = links[left.id];
          const number = rightId === undefined ? null : orderOfLeft(left.id) + 1;
          const status = pairStatus(locked, rightId, rightTextById, correctRightFor(left.text));

          return (
            <li key={left.id}>
              <SideButton
                side={left}
                selected={selectedLeft === left.id}
                number={number}
                status={status}
                disabled={locked}
                onClick={() => {
                  chooseLeft(left.id);
                }}
                label={`Terme : ${left.text}${rightId ? `, associé à ${rightTextById(rightId)}` : ''}`}
              />
            </li>
          );
        })}
      </ul>

      <ul className="flex flex-col gap-3" aria-label="Définitions">
        {exercise.rights.map((right) => {
          const ownerLeft = rightToLeft[right.id];
          const number = ownerLeft === undefined ? null : orderOfLeft(ownerLeft) + 1;
          const status =
            ownerLeft === undefined
              ? 'idle'
              : pairStatus(
                  locked,
                  right.id,
                  rightTextById,
                  correctRightFor(
                    exercise.lefts.find((l) => l.id === ownerLeft)?.text ?? '',
                  ),
                );

          return (
            <li key={right.id}>
              <SideButton
                side={right}
                selected={false}
                number={number}
                status={status}
                disabled={locked}
                onClick={() => {
                  chooseRight(right.id);
                }}
                label={`Définition : ${right.text}`}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type PairStatus = 'idle' | 'linked' | 'correct' | 'wrong';

function pairStatus(
  locked: boolean,
  rightId: string | undefined,
  rightTextById: (id: string) => string,
  correctRight: string | null,
): PairStatus {
  if (rightId === undefined) return 'idle';
  if (!locked) return 'linked';
  if (correctRight !== null && rightTextById(rightId) === correctRight) return 'correct';
  return 'wrong';
}

function SideButton({
  side,
  selected,
  number,
  status,
  disabled,
  onClick,
  label,
}: {
  side: MatchingSide;
  selected: boolean;
  number: number | null;
  status: PairStatus;
  disabled: boolean;
  onClick: () => void;
  label: string;
}): ReactElement {
  return (
    <button
      type="button"
      aria-pressed={selected || number !== null}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={sideClass({ selected, status })}
    >
      {number !== null && (
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-full bg-current/15 text-xs font-extrabold"
        >
          {number}
        </span>
      )}
      <span className="text-left text-sm font-bold leading-snug">{side.text}</span>
    </button>
  );
}

function sideClass({ selected, status }: { selected: boolean; status: PairStatus }): string {
  const base =
    'flex min-h-[3.5rem] w-full touch-manipulation items-center gap-2 rounded-2xl border-2 px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  if (status === 'correct') return `${base} border-feather-green bg-feather-green/10 text-feather-green`;
  if (status === 'wrong') return `${base} border-cardinal bg-cardinal/10 text-cardinal`;
  if (selected) return `${base} border-macaw bg-macaw/15 text-foreground`;
  if (status === 'linked') return `${base} border-macaw/60 bg-macaw/5 text-foreground`;

  return `${base} border-border bg-surface text-foreground hover:border-border-strong disabled:opacity-70`;
}
