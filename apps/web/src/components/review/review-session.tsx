'use client';

import { Button, Mascot, ProgressBar, type MascotMood } from '@bayt/ui';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';

import { DEMO_USER_ID } from '@/lib/api/client';
import { useIncrementProgress } from '@/lib/api/progress-queries';
import { useDueQueue, usePreview, useSubmitReview } from '@/lib/api/queries';
import type { ReviewGrade } from '@/lib/api/types';
import { formatInterval } from '@/lib/format-interval';
import type { XpRewardData } from '@/components/progress/xp-reward';

import { Flashcard } from './flashcard';
import { GradeButtons } from './grade-buttons';
import { mascotMessage, moodForGrade } from './mascot-message';
import { SessionComplete } from './session-complete';

/** Notes accessibles au clavier, dans l'ordre des touches 1 à 4. */
const SHORTCUT_GRADES: readonly ReviewGrade[] = ['Again', 'Hard', 'Good', 'Easy'];

/** Un rappel réussi déclenche un flash vert, un rappel manqué un flash rouge. */
const POSITIVE_GRADES: readonly ReviewGrade[] = ['Good', 'Easy'];

/** Flash de feedback affiché au moment de la note. */
interface Flash {
  readonly nonce: number;
  readonly color: string;
}

/**
 * La boucle de révision : une carte, une réponse, une note, la suivante.
 *
 * Le composant ne décide jamais d'un intervalle : il affiche ce que l'API
 * projette (`preview`) et enregistre ce que l'apprenant répond (`POST /reviews`).
 */
export function ReviewSession(): ReactElement {
  const userId = DEMO_USER_ID;
  const reduceMotion = useReducedMotion();

  const queue = useDueQueue(userId);
  const submit = useSubmitReview(userId);
  const increment = useIncrementProgress(userId);

  const [revealed, setRevealed] = useState(false);
  const [lastGrade, setLastGrade] = useState<ReviewGrade | null>(null);
  /** Humeur déclenchée par la dernière note, remise à zéro à la carte suivante. */
  const [reaction, setReaction] = useState<MascotMood | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  /** Récompense cumulée de la session (XP, objectif, série). */
  const [reward, setReward] = useState<XpRewardData>({
    xpGained: 0,
    goalReached: false,
    streakIncreased: false,
    streak: 0,
    goalMet: false,
  });

  const card = queue.data?.cards[0] ?? null;
  const itemId = card?.item.id ?? null;

  // Total de la session, figé au premier chargement de la file : la barre de
  // progression avance (cartes traitées / total) sans jamais reculer, même
  // quand la file se vide. Mémorisé dans un état (et non muté au rendu) pour
  // rester fiable à travers les re-rendus.
  const remaining = queue.data?.cards.length ?? 0;
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setTotal((current) => Math.max(current, remaining));
  }, [remaining]);

  const done = Math.max(0, total - remaining);

  const preview = usePreview(userId, itemId, revealed);

  // Chaque nouvelle carte repart cachée.
  useEffect(() => {
    setRevealed(false);
    setReaction(null);
  }, [itemId]);

  const reveal = useCallback(() => {
    setRevealed(true);
  }, []);

  const grade = useCallback(
    (value: ReviewGrade) => {
      if (itemId === null || submit.isPending) {
        return;
      }

      setLastGrade(value);
      setReaction(moodForGrade(value));
      setFlash({
        nonce: Date.now(),
        color: POSITIVE_GRADES.includes(value)
          ? 'var(--color-feather-green)'
          : 'var(--color-cardinal)',
      });

      submit.mutate(
        { itemId, grade: value },
        {
          onSuccess: (result) => {
            setFeedback(`Revu. Prochain passage dans ${formatInterval(result.review.intervalMs)}.`);

            // Chaque carte révisée rapporte de l'XP (gamification, distincte de FSRS).
            increment.mutate(
              { type: 'review', grade: value },
              {
                onSuccess: (gain) => {
                  setReward((prev) => ({
                    xpGained: prev.xpGained + gain.xpGained,
                    goalReached: prev.goalReached || gain.goalJustReached,
                    streakIncreased: prev.streakIncreased || gain.streakIncreased,
                    streak: gain.status.streak,
                    goalMet: gain.status.goalMet,
                  }));
                },
              },
            );
          },
          onError: () => {
            setFeedback('La révision n\'a pas pu être enregistrée. La carte reste dans la file.');
          },
        },
      );
    },
    [itemId, submit, increment],
  );

  /** Raccourcis clavier : Espace révèle, 1 à 4 notent. */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey || card === null) {
        return;
      }

      if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        reveal();

        return;
      }

      if (revealed) {
        const index = Number.parseInt(event.key, 10) - 1;
        const selected = SHORTCUT_GRADES[index];

        if (selected !== undefined) {
          event.preventDefault();
          grade(selected);
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [card, revealed, reveal, grade]);

  /**
   * Humeur de la mascotte.
   *
   * Elle réagit à la note qui vient d'être donnée, puis revient au calme avec
   * la carte suivante. `happy` et `encouraging` n'ont pas encore d'illustration
   * dédiée : le composant retombe sur `idle` sans que ce code ne le sache.
   */
  const mood = useMemo<MascotMood>(() => {
    if (queue.data !== undefined && card === null) {
      return 'celebrating';
    }

    return reaction ?? 'idle';
  }, [queue.data, card, reaction]);

  if (queue.isPending) {
    return <SessionSkeleton />;
  }

  if (queue.isError) {
    return <ConnectionError onRetry={() => void queue.refetch()} />;
  }

  if (card === null) {
    return <SessionComplete onRefresh={() => void queue.refetch()} reward={reward} />;
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5 sm:gap-7">
      {/* Flash de feedback coloré — décoratif, l'info reste portée par aria-live. */}
      {flash !== null && (
        <div
          key={flash.nonce}
          aria-hidden="true"
          className="bayt-flash pointer-events-none fixed inset-0 z-40"
          style={{ backgroundColor: flash.color }}
        />
      )}

      <SessionProgress done={done} total={total} remaining={remaining} />

      <AnimatePresence mode="wait">
        <motion.div
          key={card.item.id}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Flashcard card={card} revealed={revealed} onReveal={reveal} />
        </motion.div>
      </AnimatePresence>

      <MascotPanel mood={mood} grade={lastGrade} revealed={revealed} />

      {/* Zone d'action, ancrée en bas — la plus accessible au pouce sur mobile. */}
      <div className="min-h-[7.75rem]">
        {revealed ? (
          <GradeButtons
            outcomes={preview.data?.outcomes}
            disabled={submit.isPending}
            onGrade={grade}
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              onClick={reveal}
              aria-keyshortcuts="Space"
              className="w-full touch-manipulation sm:w-auto"
            >
              Révéler la réponse
            </Button>
            <p className="text-center text-sm font-bold text-muted-foreground">
              Astuce : <kbd className="font-extrabold">Espace</kbd> pour révéler, puis{' '}
              <kbd className="font-extrabold">1</kbd> à <kbd className="font-extrabold">4</kbd> pour
              noter.
            </p>
          </div>
        )}
      </div>

      {/* Annonces pour les lecteurs d'écran, sans perturber l'affichage. */}
      <p aria-live="polite" className="sr-only">
        {feedback ??
          (revealed ? 'Réponse révélée. Note ton rappel de 1 à 4.' : 'Question affichée.')}
      </p>
    </div>
  );
}

/** Barre de progression Duolingo + compte des cartes restantes. */
function SessionProgress({
  done,
  total,
  remaining,
}: {
  done: number;
  total: number;
  remaining: number;
}): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-extrabold tracking-tight">Session de révision</h1>
        <p className="text-sm font-bold tabular-nums text-muted-foreground">
          {remaining} carte{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
        </p>
      </div>
      <ProgressBar
        value={total === 0 ? 0 : done / total}
        label={`${String(done)} carte(s) révisée(s) sur ${String(total)}`}
      />
    </div>
  );
}

/** La mascotte et son message, côte à côte — la zone d'indice de l'écran. */
function MascotPanel({
  mood,
  grade,
  revealed,
}: {
  mood: MascotMood;
  grade: ReviewGrade | null;
  revealed: boolean;
}): ReactElement {
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
      <Mascot mood={mood} size="md" priority />
      <p className="text-base font-bold leading-relaxed text-muted-foreground">
        {mascotMessage(mood, { revealed, grade })}
      </p>
    </div>
  );
}

/** État de chargement — même silhouette que la carte, pour éviter le saut. */
function SessionSkeleton(): ReactElement {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-7" aria-busy="true" aria-live="polite">
      <div className="h-4 w-full animate-pulse rounded-full bg-surface-hover" />
      <div className="h-[clamp(20rem,44vh,26rem)] animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
      <div className="h-20 animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
      <span className="sr-only">Chargement de la file de révision.</span>
    </div>
  );
}

/** Le Worker local n'est pas joignable : on le dit clairement. */
function ConnectionError({ onRetry }: { onRetry: () => void }): ReactElement {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 text-center" role="alert">
      <Mascot mood="encouraging" size="lg" />
      <h1 className="text-2xl font-extrabold">L&apos;API BAYT est injoignable</h1>
      <p className="text-base font-bold leading-relaxed text-muted-foreground">
        Le Worker local ne répond pas. Lance-le avec{' '}
        <code className="font-extrabold">pnpm dev</code> à la racine du projet, puis réessaie.
      </p>
      <Button onClick={onRetry}>Réessayer</Button>
    </div>
  );
}
