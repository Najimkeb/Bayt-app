'use client';

import { Button, Mascot, type MascotMood } from '@bayt/ui';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';

import { DEMO_USER_ID } from '@/lib/api/client';
import { useDueQueue, usePreview, useSubmitReview } from '@/lib/api/queries';
import type { ReviewGrade } from '@/lib/api/types';
import { formatInterval } from '@/lib/format-interval';

import { Flashcard } from './flashcard';
import { GradeButtons } from './grade-buttons';
import { mascotMessage, moodForGrade } from './mascot-message';
import { SessionComplete } from './session-complete';

/** Notes accessibles au clavier, dans l'ordre des touches 1 a 4. */
const SHORTCUT_GRADES: readonly ReviewGrade[] = ['Again', 'Hard', 'Good', 'Easy'];

/**
 * La boucle de revision : une carte, une reponse, une note, la suivante.
 *
 * Le composant ne decide jamais d'un intervalle : il affiche ce que l'API
 * projette (`preview`) et enregistre ce que l'apprenant repond (`POST /reviews`).
 */
export function ReviewSession(): ReactElement {
  const userId = DEMO_USER_ID;
  const reduceMotion = useReducedMotion();

  const queue = useDueQueue(userId);
  const submit = useSubmitReview(userId);

  const [revealed, setRevealed] = useState(false);
  const [lastGrade, setLastGrade] = useState<ReviewGrade | null>(null);
  /** Humeur declenchee par la derniere note, remise a zero a la carte suivante. */
  const [reaction, setReaction] = useState<MascotMood | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const card = queue.data?.cards[0] ?? null;
  const itemId = card?.item.id ?? null;

  const preview = usePreview(userId, itemId, revealed);

  // Chaque nouvelle carte repart cachee.
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

      submit.mutate(
        { itemId, grade: value },
        {
          onSuccess: (result) => {
            setFeedback(`Revu. Prochain passage dans ${formatInterval(result.review.intervalMs)}.`);
          },
          onError: () => {
            setFeedback('La revision n\'a pas pu etre enregistree. La carte reste dans la file.');
          },
        },
      );
    },
    [itemId, submit],
  );

  /** Raccourcis clavier : Espace revele, 1 a 4 notent. */
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
   * Elle reagit a la note qui vient d'etre donnee, puis revient au calme avec
   * la carte suivante. `happy` et `encouraging` n'ont pas encore d'illustration
   * dediee : le composant retombe sur `idle` sans que ce code ne le sache.
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
    return <SessionComplete onRefresh={() => void queue.refetch()} />;
  }

  const remaining = queue.data.cards.length;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <ProgressHeader remaining={remaining} />

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

      <div className="min-h-[7.5rem]">
        {revealed ? (
          <GradeButtons
            outcomes={preview.data?.outcomes}
            disabled={submit.isPending}
            onGrade={grade}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={reveal} aria-keyshortcuts="Space" className="w-full sm:w-auto">
              Reveler la reponse
            </Button>
            <p className="text-xs text-muted-foreground">
              Astuce : <kbd className="font-semibold">Espace</kbd> pour reveler, puis{' '}
              <kbd className="font-semibold">1</kbd> a <kbd className="font-semibold">4</kbd> pour
              noter.
            </p>
          </div>
        )}
      </div>

      <MascotPanel mood={mood} grade={lastGrade} revealed={revealed} />

      {/* Annonces pour les lecteurs d'ecran, sans perturber l'affichage. */}
      <p aria-live="polite" className="sr-only">
        {feedback ?? (revealed ? 'Reponse revelee. Note ton rappel de 1 a 4.' : 'Question affichee.')}
      </p>
    </div>
  );
}

/** Bandeau de progression de la session. */
function ProgressHeader({ remaining }: { remaining: number }): ReactElement {
  return (
    <div className="flex items-baseline justify-between">
      <h1 className="text-lg font-semibold tracking-tight">Session de revision</h1>
      <p className="text-sm text-muted-foreground tabular-nums">
        {remaining} carte{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
      </p>
    </div>
  );
}

/** La mascotte et son message, cote a cote — la zone d'indice de l'ecran. */
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
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface/60 p-4">
      <Mascot mood={mood} size="md" priority />
      <p className="text-sm leading-relaxed text-muted-foreground">
        {mascotMessage(mood, { revealed, grade })}
      </p>
    </div>
  );
}

/** Etat de chargement — meme silhouette que la carte, pour eviter le saut. */
function SessionSkeleton(): ReactElement {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-8" aria-busy="true" aria-live="polite">
      <div className="h-6 w-48 animate-pulse rounded-full bg-surface-hover" />
      <div className="h-[clamp(18rem,42vh,24rem)] animate-pulse rounded-3xl bg-surface-hover" />
      <div className="h-20 animate-pulse rounded-2xl bg-surface-hover" />
      <span className="sr-only">Chargement de la file de revision.</span>
    </div>
  );
}

/** Le Worker local n'est pas joignable : on le dit clairement. */
function ConnectionError({ onRetry }: { onRetry: () => void }): ReactElement {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 text-center" role="alert">
      <Mascot mood="encouraging" size="md" />
      <h1 className="text-xl font-semibold">L&apos;API BAYT est injoignable</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Le Worker local ne repond pas. Lance-le avec <code className="font-semibold">pnpm dev</code>{' '}
        a la racine du projet, puis reessaie.
      </p>
      <Button onClick={onRetry}>Reessayer</Button>
    </div>
  );
}
