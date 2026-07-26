'use client';

import { Button, Mascot, ProgressBar, Surface, type MascotMood } from '@bayt/ui';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import { useLesson, useSubmitAnswer } from '@/lib/api/lesson-queries';
import { useUserId } from '@/lib/auth/use-user-id';
import type { AnswerResult, ExerciseAnswer, PresentedExercise } from '@/lib/api/lesson-types';
import { useCompleteLesson } from '@/lib/api/path-queries';
import { useIncrementProgress } from '@/lib/api/progress-queries';
import type { XpRewardData } from '@/components/progress/xp-reward';

import { ExitButton } from '@/components/nav/exit-button';

import { FillBlankExerciseView } from './exercises/fill-blank-exercise';
import { MatchingExerciseView } from './exercises/matching-exercise';
import { McqExerciseView } from './exercises/mcq-exercise';
import { FeedbackBar } from './feedback-bar';
import { LessonComplete } from './lesson-complete';

/**
 * Une leçon jouable : une séquence d'exercices variés, un à la fois, avec
 * feedback immédiat. Un exercice raté **revient en fin de file** jusqu'à
 * réussite — pas de cœurs, pas de vies : se tromper fait partie de
 * l'apprentissage (cf. lessons.md).
 *
 * La séquence est orchestrée ici ; la correction et la note FSRS restent au
 * domaine, via l'API.
 */
export function LessonSession({ lessonId }: { lessonId: string }): ReactElement {
  const userId = useUserId();
  const reduceMotion = useReducedMotion();

  const lesson = useLesson(lessonId);
  const submit = useSubmitAnswer(lessonId, userId);
  const increment = useIncrementProgress(userId);
  const complete = useCompleteLesson(userId);

  /** File des exercices restants (par id), dans l'ordre à jouer. */
  const [queue, setQueue] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<ExerciseAnswer | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  /** Exercices déjà ratés : leur prochaine réussite comptera comme « Hard ». */
  const [assisted, setAssisted] = useState<ReadonlySet<string>>(new Set());
  /** Récompense cumulée de la session (XP, objectif, série). */
  const [reward, setReward] = useState<XpRewardData>({
    xpGained: 0,
    goalReached: false,
    streakIncreased: false,
    streak: 0,
    goalMet: false,
  });

  // Initialise la file dès que la leçon est chargée.
  const exercises = lesson.data?.exercises;
  const activeQueue = useMemo<string[]>(() => {
    if (queue !== null) return queue;
    return exercises ? exercises.map((exercise) => exercise.id) : [];
  }, [queue, exercises]);

  const total = exercises?.length ?? 0;
  const remaining = activeQueue.length;
  const done = total - remaining;

  const current: PresentedExercise | null = useMemo(() => {
    const id = activeQueue[0];
    return exercises?.find((exercise) => exercise.id === id) ?? null;
  }, [activeQueue, exercises]);

  // Leçon terminée (file vidée) : on la marque complète une seule fois, ce qui
  // débloque la suivante sur le chemin de l'accueil.
  const completionFired = useRef(false);
  useEffect(() => {
    if (
      !completionFired.current &&
      exercises !== undefined &&
      exercises.length > 0 &&
      current === null
    ) {
      completionFired.current = true;
      complete.mutate(lessonId);
    }
  }, [current, exercises, complete, lessonId]);

  const check = useCallback(() => {
    if (current === null || draft === null || submit.isPending || result !== null) {
      return;
    }

    submit.mutate(
      { exerciseId: current.id, answer: draft, assisted: assisted.has(current.id) },
      {
        onSuccess: (answerResult) => {
          setResult(answerResult);

          // Un exercice réussi rapporte de l'XP (la gamification est distincte du
          // moteur FSRS, qui a déjà enregistré la révision côté API).
          if (answerResult.correct) {
            increment.mutate(
              { type: 'exercise', correct: true },
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
          }
        },
      },
    );
  }, [current, draft, submit, result, assisted, increment]);

  const advance = useCallback(() => {
    if (current === null || result === null) {
      return;
    }

    setQueue(() => {
      const rest = activeQueue.slice(1);

      if (result.correct) {
        return rest; // réussi : sort de la file
      }

      return [...rest, current.id]; // raté : revient à la fin
    });

    if (!result.correct) {
      setAssisted((prev) => new Set(prev).add(current.id));
    }

    setDraft(null);
    setResult(null);
  }, [current, result, activeQueue]);

  const mood = useMemo<MascotMood>(() => {
    if (result === null) return 'idle';
    return result.correct ? 'happy' : 'encouraging';
  }, [result]);

  if (lesson.isPending) {
    return <LessonSkeleton />;
  }

  if (lesson.isError) {
    return <LessonError lessonId={lessonId} onRetry={() => void lesson.refetch()} />;
  }

  if (current === null) {
    return <LessonComplete title={lesson.data.title} reward={reward} />;
  }

  const locked = result !== null;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5 sm:gap-6">
      <div className="flex items-center gap-3">
        {/* Quitter (en pleine tâche) : confirmation, la leçon n'est pas terminée. */}
        <ExitButton
          confirmWhen={remaining > 0}
          confirmBody="Cette leçon n'est pas terminée : ta progression dans la leçon ne sera pas conservée."
        />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
              {lesson.data.title}
            </h1>
            <p className="shrink-0 text-sm font-bold tabular-nums text-muted-foreground">
              {done} / {total}
            </p>
          </div>
          <ProgressBar
            value={total === 0 ? 0 : done / total}
            label={`${String(done)} exercice(s) réussi(s) sur ${String(total)}`}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-start gap-3">
            <Mascot mood={mood} size="sm" priority />
            <Surface className="flex-1 p-4">
              <p className="text-balance text-lg font-extrabold leading-snug sm:text-xl">
                {current.prompt}
              </p>
            </Surface>
          </div>

          <ExerciseView
            exercise={current}
            draft={draft}
            onAnswer={setDraft}
            locked={locked}
            result={result}
          />
        </motion.div>
      </AnimatePresence>

      {/* Zone d'action, ancrée en bas — feedback puis « Continuer », ou « Vérifier ». */}
      <div className="min-h-[5.5rem]">
        {result !== null ? (
          <FeedbackBar result={result} onContinue={advance} />
        ) : (
          <Button
            size="lg"
            variant="green"
            disabled={draft === null || submit.isPending}
            onClick={check}
            className="w-full touch-manipulation"
          >
            Vérifier
          </Button>
        )}
      </div>
    </div>
  );
}

/** Aiguille vers le composant du bon type d'exercice. */
function ExerciseView({
  exercise,
  draft,
  onAnswer,
  locked,
  result,
}: {
  exercise: PresentedExercise;
  draft: ExerciseAnswer | null;
  onAnswer: (answer: ExerciseAnswer | null) => void;
  locked: boolean;
  result: AnswerResult | null;
}): ReactElement {
  switch (exercise.type) {
    case 'mcq':
      return (
        <McqExerciseView
          exercise={exercise}
          choice={draft?.kind === 'mcq' ? draft.choice : null}
          onChoose={onAnswer}
          locked={locked}
          result={result}
        />
      );
    case 'fill_blank':
      return (
        <FillBlankExerciseView
          exercise={exercise}
          text={draft?.kind === 'fill_blank' ? draft.text : ''}
          onType={(answer) => {
            onAnswer(answer.kind === 'fill_blank' && answer.text.trim() === '' ? null : answer);
          }}
          locked={locked}
          result={result}
        />
      );
    case 'matching':
      return (
        <MatchingExerciseView
          exercise={exercise}
          onChange={onAnswer}
          locked={locked}
          result={result}
        />
      );
  }
}

function LessonSkeleton(): ReactElement {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-5" aria-busy="true" aria-live="polite">
      <div className="h-4 w-full animate-pulse rounded-full bg-surface-hover" />
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
      <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
      <span className="sr-only">Chargement de la leçon.</span>
    </div>
  );
}

function LessonError({
  lessonId,
  onRetry,
}: {
  lessonId: string;
  onRetry: () => void;
}): ReactElement {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 text-center" role="alert">
      <Mascot mood="encouraging" size="lg" />
      <h1 className="text-2xl font-extrabold">Leçon indisponible</h1>
      <p className="text-base font-bold leading-relaxed text-muted-foreground">
        Impossible de charger la leçon « {lessonId} ». Vérifie que l&apos;API tourne
        (<code className="font-extrabold">pnpm dev</code>) et que la démo est en base
        (<code className="font-extrabold">pnpm db:reset</code>).
      </p>
      <Button onClick={onRetry}>Réessayer</Button>
    </div>
  );
}
