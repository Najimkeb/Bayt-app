'use client';

import { normalizeText } from '@bayt/domain';
import { Button, ProgressBar } from '@bayt/ui';
import { Check, X } from 'lucide-react';
import { useState, type ReactElement } from 'react';

import { playCorrect, playWrong, primeSound } from '@/lib/audio/feedback-sounds';
import type { QuizOutcome, QuizQuestion } from '@/lib/api/quiz-types';

/**
 * Déroulé d'un quiz : une question à la fois, correction immédiate (visuelle +
 * son juste/faux), score en direct, barre de progression. La correction se fait
 * côté client (quiz sans enjeu FSRS). Le feedback n'est jamais QUE sonore : un
 * repère visuel (couleur + icône + libellé) accompagne toujours le son.
 */
export function QuizPlay({
  questions,
  onFinish,
}: {
  questions: readonly QuizQuestion[];
  onFinish: (outcomes: QuizOutcome[]) => void;
}): ReactElement {
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<QuizOutcome[]>([]);
  const [mcqChoice, setMcqChoice] = useState<number | null>(null);
  const [tfChoice, setTfChoice] = useState<boolean | null>(null);
  const [text, setText] = useState('');
  const [answered, setAnswered] = useState<{ correct: boolean } | null>(null);

  const question = questions[index]!;
  const total = questions.length;
  const score = outcomes.filter((o) => o.correct).length;

  const ready =
    question.kind === 'mcq'
      ? mcqChoice !== null
      : question.kind === 'true_false'
        ? tfChoice !== null
        : normalizeText(text) !== '';

  function check(): void {
    primeSound();
    let correct = false;
    if (question.kind === 'mcq') {
      correct = mcqChoice === question.answerIndex;
    } else if (question.kind === 'true_false') {
      correct = tfChoice === question.isTrue;
    } else {
      correct = normalizeText(text) === normalizeText(question.answer);
    }
    setAnswered({ correct });
    setOutcomes((prev) => [...prev, { question, correct }]);
    if (correct) {
      playCorrect();
    } else {
      playWrong();
    }
  }

  function next(): void {
    if (index + 1 >= total) {
      onFinish(outcomes);
      return;
    }
    setIndex(index + 1);
    setMcqChoice(null);
    setTfChoice(null);
    setText('');
    setAnswered(null);
  }

  const progress = (answered ? index + 1 : index) / total;

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <ProgressBar value={progress} className="flex-1" label="Progression du quiz" />
        <span className="shrink-0 text-sm font-black tabular-nums text-muted-foreground">
          {score}/{total}
        </span>
      </div>

      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border-2 border-border bg-surface p-6">
        <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
          Question {index + 1} sur {total}
        </span>
        <p className="text-xl font-extrabold leading-snug">{question.prompt}</p>

        {question.kind === 'true_false' && (
          <p className="mt-2 rounded-[var(--radius-button)] border-l-4 border-macaw/40 bg-surface-hover/60 p-3 text-base font-bold">
            {question.statement}
          </p>
        )}

        <div className="mt-3">
          {question.kind === 'mcq' && (
            <McqOptions
              question={question}
              choice={mcqChoice}
              answered={answered !== null}
              onChoose={setMcqChoice}
            />
          )}
          {question.kind === 'true_false' && (
            <TrueFalseOptions
              choice={tfChoice}
              answered={answered !== null}
              isTrue={question.isTrue}
              onChoose={setTfChoice}
            />
          )}
          {question.kind === 'fill_blank' && (
            <input
              type="text"
              value={text}
              disabled={answered !== null}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && ready && answered === null) {
                  check();
                }
              }}
              placeholder="Ta réponse"
              aria-label="Ta réponse"
              autoComplete="off"
              className="w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 py-3 text-base font-bold text-foreground focus-visible:border-macaw focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
            />
          )}
        </div>
      </div>

      {answered !== null ? (
        <Feedback correct={answered.correct} answer={question.correctAnswer} onContinue={next} last={index + 1 >= total} />
      ) : (
        <Button
          type="button"
          variant="brand"
          size="lg"
          disabled={!ready}
          onClick={check}
          className="self-stretch"
        >
          Vérifier
        </Button>
      )}
    </div>
  );
}

/** Barre de correction : couleur + icône + libellé (jamais que le son) + bonne réponse. */
function Feedback({
  correct,
  answer,
  onContinue,
  last,
}: {
  correct: boolean;
  answer: string;
  onContinue: () => void;
  last: boolean;
}): ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col gap-3 rounded-[var(--radius-card)] border-2 p-4 ${
        correct ? 'border-feather-green/50 bg-feather-green/10' : 'border-cardinal/50 bg-cardinal/10'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex size-7 items-center justify-center rounded-full text-white ${
            correct ? 'bg-feather-green' : 'bg-cardinal'
          }`}
        >
          {correct ? <Check aria-hidden="true" className="size-4" /> : <X aria-hidden="true" className="size-4" />}
        </span>
        <p className="text-base font-extrabold">{correct ? 'Bien vu !' : 'Presque…'}</p>
      </div>
      {!correct && (
        <p className="text-sm font-bold text-muted-foreground">
          Bonne réponse : <span className="font-extrabold text-foreground">{answer}</span>
        </p>
      )}
      <Button type="button" variant="brand" size="md" onClick={onContinue} className="self-start">
        {last ? 'Voir le résultat' : 'Continuer'}
      </Button>
    </div>
  );
}

/** Options d'un QCM, avec mise en évidence de la bonne/mauvaise après réponse. */
function McqOptions({
  question,
  choice,
  answered,
  onChoose,
}: {
  question: { options: readonly string[]; answerIndex: number };
  choice: number | null;
  answered: boolean;
  onChoose: (i: number) => void;
}): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      {question.options.map((option, i) => {
        const isCorrect = i === question.answerIndex;
        const isChosen = i === choice;
        let cls = 'border-border hover:bg-surface-hover';
        if (answered && isCorrect) {
          cls = 'border-feather-green bg-feather-green/10 text-feather-green';
        } else if (answered && isChosen) {
          cls = 'border-cardinal bg-cardinal/10 text-cardinal';
        } else if (!answered && isChosen) {
          cls = 'border-macaw bg-macaw/10 text-macaw';
        }

        return (
          <button
            key={i}
            type="button"
            disabled={answered}
            aria-pressed={isChosen}
            onClick={() => onChoose(i)}
            className={`rounded-[var(--radius-button)] border-2 px-4 py-3 text-left text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${cls}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

/** Boutons Vrai / Faux, avec mise en évidence après réponse. */
function TrueFalseOptions({
  choice,
  answered,
  isTrue,
  onChoose,
}: {
  choice: boolean | null;
  answered: boolean;
  isTrue: boolean;
  onChoose: (value: boolean) => void;
}): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[true, false].map((value) => {
        const label = value ? 'Vrai' : 'Faux';
        const isChosen = choice === value;
        const isRight = value === isTrue;
        let cls = 'border-border hover:bg-surface-hover';
        if (answered && isRight) {
          cls = 'border-feather-green bg-feather-green/10 text-feather-green';
        } else if (answered && isChosen) {
          cls = 'border-cardinal bg-cardinal/10 text-cardinal';
        } else if (!answered && isChosen) {
          cls = 'border-macaw bg-macaw/10 text-macaw';
        }

        return (
          <button
            key={label}
            type="button"
            disabled={answered}
            aria-pressed={isChosen}
            onClick={() => onChoose(value)}
            className={`rounded-[var(--radius-button)] border-2 px-4 py-3 text-base font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${cls}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
