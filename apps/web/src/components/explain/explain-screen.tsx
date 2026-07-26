'use client';

import { Button, Mascot } from '@bayt/ui';
import { Mic, Square } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type ReactElement } from 'react';

import type { EvaluationResult } from '@/lib/api/explanation-types';
import {
  useCreateExplanationDraft,
  useEvaluateExplanation,
  useExplanationHistory,
} from '@/lib/api/explanation-queries';
import { formatInterval } from '@/lib/format-interval';
import { useSpeechRecognition } from '@/lib/use-speech-recognition';

import { ExplanationFeedback } from './explanation-feedback';
import { ExplanationHistory } from './explanation-history';

/**
 * Mode « Explique à BAYT ».
 *
 * L'apprenant explique un concept avec ses mots ; BAYT (la mascotte) évalue la
 * compréhension et répond à la première personne. La note alimente FSRS quand
 * le concept est relié à une carte. Dictée vocale accessible (repli texte).
 */
export function ExplainScreen(): ReactElement {
  const params = useSearchParams();
  const itemId = params.get('itemId') ?? undefined;
  const initialTopic = params.get('topic') ?? '';
  const linkedToCard = itemId !== undefined;

  const [topic, setTopic] = useState(initialTopic);
  const [explanation, setExplanation] = useState('');
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const evaluate = useEvaluateExplanation(itemId);
  const history = useExplanationHistory(itemId);
  const speech = useSpeechRecognition((text) =>
    setExplanation((prev) => (prev === '' ? text : `${prev} ${text}`)),
  );

  function submit(): void {
    if (topic.trim().length < 3 || explanation.trim().length < 10) {
      return;
    }
    if (speech.listening) {
      speech.stop();
    }
    evaluate.mutate(
      { topic: topic.trim(), explanation: explanation.trim() },
      { onSuccess: setResult },
    );
  }

  function reset(): void {
    setResult(null);
    setExplanation('');
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">Explique à BAYT</h1>
        <Link href="/" className="shrink-0 text-sm font-extrabold text-macaw underline underline-offset-2">
          ← Accueil
        </Link>
      </div>

      {result === null ? (
        <InputPhase
          topic={topic}
          setTopic={setTopic}
          topicLocked={linkedToCard}
          explanation={explanation}
          setExplanation={setExplanation}
          speech={speech}
          pending={evaluate.isPending}
          error={evaluate.isError}
          onSubmit={submit}
        />
      ) : (
        <ResultPhase
          result={result}
          topic={topic}
          explanation={explanation}
          linkedToCard={linkedToCard}
          onReset={reset}
        />
      )}

      {history.data !== undefined && history.data.history.length > 0 && (
        <ExplanationHistory entries={history.data.history} />
      )}
    </div>
  );
}

/** Phase de saisie : invite de BAYT, sujet, explication (+ dictée). */
function InputPhase({
  topic,
  setTopic,
  topicLocked,
  explanation,
  setExplanation,
  speech,
  pending,
  error,
  onSubmit,
}: {
  topic: string;
  setTopic: (v: string) => void;
  topicLocked: boolean;
  explanation: string;
  setExplanation: (v: string) => void;
  speech: ReturnType<typeof useSpeechRecognition>;
  pending: boolean;
  error: boolean;
  onSubmit: () => void;
}): ReactElement {
  const invite =
    topic.trim() !== ''
      ? `Explique-moi « ${topic.trim()} » avec tes mots, comme si tu me l'apprenais.`
      : "Choisis un sujet, puis explique-le-moi avec tes mots, comme si tu me l'apprenais.";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
        <Mascot mood="encouraging" size="md" priority />
        <p className="text-base font-bold leading-relaxed text-muted-foreground">{invite}</p>
      </div>

      {!topicLocked && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="explain-topic" className="text-sm font-extrabold">
            Sujet
          </label>
          <input
            id="explain-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex. La répétition espacée"
            className="w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 py-3 text-base font-bold text-foreground focus-visible:border-macaw focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="explain-text" className="text-sm font-extrabold">
            Ton explication
          </label>
          {speech.supported && (
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? 'Arrêter la dictée' : 'Dicter mon explication'}
              className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                speech.listening
                  ? 'border-cardinal bg-cardinal/10 text-cardinal'
                  : 'border-border text-muted-foreground hover:bg-surface-hover'
              }`}
            >
              {speech.listening ? (
                <Square aria-hidden="true" className="size-3.5" />
              ) : (
                <Mic aria-hidden="true" className="size-3.5" />
              )}
              {speech.listening ? 'Arrêter' : 'Dicter'}
            </button>
          )}
        </div>
        <textarea
          id="explain-text"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={7}
          placeholder="Explique le concept avec tes propres mots…"
          className="w-full resize-y rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 py-3 text-base font-bold text-foreground focus-visible:border-macaw focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p aria-live="polite" className="text-xs font-bold text-muted-foreground">
          {speech.listening ? 'Dictée en cours…' : ''}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm font-bold text-cardinal">
          BAYT n&apos;a pas pu évaluer ton explication. Réessaie dans un instant.
        </p>
      )}

      <Button
        variant="brand"
        size="lg"
        disabled={pending || topic.trim().length < 3 || explanation.trim().length < 10}
        onClick={onSubmit}
        className="w-full sm:w-auto sm:self-start"
      >
        {pending ? 'BAYT réfléchit…' : 'Envoyer à BAYT'}
      </Button>
    </div>
  );
}

/** Phase résultat : le retour de BAYT + FSRS + actions. */
function ResultPhase({
  result,
  topic,
  explanation,
  linkedToCard,
  onReset,
}: {
  result: EvaluationResult;
  topic: string;
  explanation: string;
  linkedToCard: boolean;
  onReset: () => void;
}): ReactElement {
  const createDraft = useCreateExplanationDraft();
  const [draftDone, setDraftDone] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <ExplanationFeedback evaluation={result.evaluation} />

      {result.review !== null ? (
        <p className="rounded-[var(--radius-card)] border-2 border-border bg-surface p-4 text-sm font-bold text-muted-foreground">
          C&apos;est noté dans ta mémoire : prochain passage de cette carte dans{' '}
          <span className="font-black text-foreground">{formatInterval(result.review.intervalMs)}</span>.
        </p>
      ) : (
        !linkedToCard && (
          <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
            {draftDone ? (
              <p className="text-sm font-bold text-muted-foreground">
                Carte proposée au studio de relecture. Elle n&apos;entrera en révision qu&apos;une fois
                validée.
              </p>
            ) : (
              <>
                <p className="text-sm font-bold text-muted-foreground">
                  Envie de réviser ce concept plus tard ? J&apos;en fais une carte (à valider avant
                  publication).
                </p>
                <Button
                  variant="brand"
                  size="md"
                  disabled={createDraft.isPending}
                  onClick={() =>
                    createDraft.mutate(
                      { topic, reformulation: result.evaluation.reformulation, explanation },
                      { onSuccess: () => setDraftDone(true) },
                    )
                  }
                  className="self-start"
                >
                  {createDraft.isPending ? 'Création…' : 'Créer une carte'}
                </Button>
              </>
            )}
          </div>
        )
      )}

      <Button variant="brand" size="lg" onClick={onReset} className="w-full sm:w-auto sm:self-start">
        Nouvelle explication
      </Button>
    </div>
  );
}
