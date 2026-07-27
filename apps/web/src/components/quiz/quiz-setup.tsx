'use client';

import { Button } from '@bayt/ui';
import { Zap } from 'lucide-react';
import { useId, useState, type FormEvent, type ReactElement } from 'react';

import { useDomains } from '@/lib/api/domain-queries';
import { hasContent } from '@/lib/api/domain-types';
import type { QuizType } from '@/lib/api/quiz-types';
import { useUserId } from '@/lib/auth/use-user-id';

/** Paramètres choisis pour lancer un quiz. */
export interface QuizParams {
  readonly domainId?: string;
  readonly count: number;
  readonly types: QuizType[];
}

const COUNTS = [10, 20] as const;
const TYPE_LABELS: readonly { value: QuizType; label: string }[] = [
  { value: 'mcq', label: 'QCM' },
  { value: 'true_false', label: 'Vrai / Faux' },
  { value: 'fill_blank', label: 'Saisie' },
];

/**
 * Écran de configuration d'un quiz : domaine (ou tous), nombre de questions,
 * types. Ne propose que les domaines qui ont des cartes.
 */
export function QuizSetup({
  onStart,
  pending,
  error,
}: {
  onStart: (params: QuizParams) => void;
  pending: boolean;
  error: string | null;
}): ReactElement {
  const ids = useId();
  const userId = useUserId();
  const domains = useDomains(userId);

  const [domainId, setDomainId] = useState<string>('all');
  const [count, setCount] = useState<number>(10);
  const [types, setTypes] = useState<QuizType[]>(['mcq', 'true_false', 'fill_blank']);

  const withCards = (domains.data?.domains ?? []).filter(hasContent);

  function toggleType(value: QuizType): void {
    setTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onStart({
      ...(domainId === 'all' ? {} : { domainId }),
      count,
      // Aucun type coché = tous (le domaine gère le repli).
      types: types.length > 0 ? types : ['mcq', 'true_false', 'fill_blank'],
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-xl flex-col gap-6 rounded-[var(--radius-card)] border-2 border-border bg-surface p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-bee/20 text-[#8a6d00]">
          <Zap aria-hidden="true" className="size-6" />
        </span>
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-tight">Quiz</h1>
          <p className="text-sm font-bold text-muted-foreground">
            Teste-toi vite et bien, sur tes cartes existantes.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${ids}-domain`} className="text-sm font-extrabold">
          Domaine
        </label>
        <select
          id={`${ids}-domain`}
          value={domainId}
          onChange={(e) => setDomainId(e.target.value)}
          className="h-12 rounded-[var(--radius-card)] border-2 border-border bg-surface px-3 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">Tous les domaines</option>
          {withCards.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-extrabold">Nombre de questions</legend>
        <div role="radiogroup" aria-label="Nombre de questions" className="flex gap-2">
          {COUNTS.map((c) => {
            const active = c === count;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCount(c)}
                className={`min-w-16 rounded-full border-2 px-4 py-2 text-sm font-extrabold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? 'border-fox-orange bg-fox-orange/10 text-fox-orange' : 'border-border text-muted-foreground hover:bg-surface-hover'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-extrabold">Types de questions</legend>
        <div className="flex flex-wrap gap-2">
          {TYPE_LABELS.map(({ value, label }) => {
            const active = types.includes(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleType(value)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? 'border-macaw bg-macaw/10 text-macaw' : 'border-border text-muted-foreground hover:bg-surface-hover'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error !== null && (
        <p role="alert" className="text-sm font-bold text-cardinal">
          {error}
        </p>
      )}

      <Button type="submit" variant="brand" size="lg" disabled={pending} className="self-start">
        <Zap aria-hidden="true" className="size-5" />
        {pending ? 'Préparation…' : 'Démarrer le quiz'}
      </Button>
    </form>
  );
}
