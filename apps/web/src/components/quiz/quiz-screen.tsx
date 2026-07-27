'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactElement } from 'react';

import { useGenerateQuiz } from '@/lib/api/quiz-queries';
import type { QuizOutcome, QuizQuestion } from '@/lib/api/quiz-types';

import { QuizPlay } from './quiz-play';
import { QuizResult } from './quiz-result';
import { QuizSetup, type QuizParams } from './quiz-setup';

type Phase = 'setup' | 'playing' | 'result';

/**
 * Section « Quiz » — distincte de la révision espacée.
 *
 * Machine à états simple : configuration → jeu → résultat. Le quiz est construit
 * à partir des cartes existantes (aucune IA) et **ne touche pas à FSRS** : c'est
 * un test ludique, le pont vers la mémoire long terme reste la révision.
 */
export function QuizScreen(): ReactElement {
  const generate = useGenerateQuiz();

  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [outcomes, setOutcomes] = useState<QuizOutcome[]>([]);
  const [lastParams, setLastParams] = useState<QuizParams | null>(null);
  const [error, setError] = useState<string | null>(null);

  function start(params: QuizParams): void {
    setError(null);
    setLastParams(params);
    generate.mutate(params, {
      onSuccess: (response) => {
        if (response.questions.length === 0) {
          setError(
            'Pas assez de cartes dans ce domaine pour un quiz. Ajoute des cartes (import, leçon, vocabulaire) puis réessaie.',
          );

          return;
        }
        setQuestions([...response.questions]);
        setOutcomes([]);
        setPhase('playing');
      },
      onError: () => setError('Le quiz n’a pas pu démarrer. Réessaie.'),
    });
  }

  function finish(result: QuizOutcome[]): void {
    setOutcomes(result);
    setPhase('result');
  }

  function replay(): void {
    if (lastParams !== null) {
      start(lastParams);
    } else {
      setPhase('setup');
    }
  }

  function reviewMissed(missed: QuizQuestion[]): void {
    setQuestions(missed);
    setOutcomes([]);
    setPhase('playing');
  }

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-6">
      {phase !== 'setup' && (
        <div className="flex w-full justify-end">
          <Link
            href="/"
            aria-label="Quitter le quiz"
            className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-5" />
          </Link>
        </div>
      )}

      {phase === 'setup' && (
        <QuizSetup onStart={start} pending={generate.isPending} error={error} />
      )}
      {phase === 'playing' && <QuizPlay questions={questions} onFinish={finish} />}
      {phase === 'result' && (
        <QuizResult outcomes={outcomes} onReplay={replay} onReviewMissed={reviewMissed} />
      )}
    </div>
  );
}
