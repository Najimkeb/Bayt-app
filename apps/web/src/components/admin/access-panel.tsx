'use client';

import { Button } from '@bayt/ui';
import { Check, Trash2, UserPlus } from 'lucide-react';
import { useId, useState, type FormEvent, type ReactElement } from 'react';

import { useAddAllowedEmail, useRemoveAllowedEmail } from '@/lib/api/admin-queries';
import type { AllowedEmail } from '@/lib/api/admin-types';

/** Formate une date epoch ms en « JJ mois AAAA » (français). */
function formatDay(ms: number): string {
  if (ms === 0) return '-';
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(ms),
    );
  } catch {
    return '-';
  }
}

/**
 * Liste blanche d'inscription : ajouter / retirer un e-mail, et voir qui s'est
 * déjà inscrit (pastille « inscrit »).
 */
export function AccessPanel({
  emails,
  registered,
}: {
  emails: readonly AllowedEmail[];
  /** E-mails ayant déjà un compte (pour la pastille « inscrit »). */
  registered: ReadonlySet<string>;
}): ReactElement {
  const ids = useId();
  const add = useAddAllowedEmail();
  const remove = useRemoveAllowedEmail();

  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    add.mutate(
      { email: email.trim(), note: note.trim() },
      {
        onSuccess: () => {
          setEmail('');
          setNote('');
        },
        onError: () => setError('Impossible d’ajouter cet e-mail. Vérifie le format.'),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-5">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${ids}-email`} className="text-sm font-extrabold">
            Autoriser un e-mail
          </label>
          <input
            id={`${ids}-email`}
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="personne@exemple.com"
            className="w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 py-3 text-base font-bold text-foreground focus-visible:border-macaw focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${ids}-note`} className="text-sm font-extrabold">
            Note <span className="font-bold text-muted-foreground">(facultatif)</span>
          </label>
          <input
            id={`${ids}-note`}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="qui, pourquoi…"
            className="w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 py-3 text-base font-bold text-foreground focus-visible:border-macaw focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error !== null && (
          <p role="alert" className="text-sm font-bold text-cardinal">
            {error}
          </p>
        )}

        <Button type="submit" variant="brand" size="md" disabled={add.isPending} className="self-start">
          <UserPlus aria-hidden="true" className="size-4" />
          {add.isPending ? 'Ajout…' : 'Autoriser'}
        </Button>
      </form>

      <ul className="flex flex-col divide-y-2 divide-border">
        {emails.length === 0 && (
          <li className="py-3 text-sm font-bold text-muted-foreground">Aucun e-mail autorisé.</li>
        )}
        {emails.map((entry) => (
          <li key={entry.email} className="flex items-center gap-3 py-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2 truncate text-sm font-extrabold">
                {entry.email}
                {registered.has(entry.email) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-feather-green/15 px-2 py-0.5 text-[0.7rem] font-black text-feather-green">
                    <Check aria-hidden="true" className="size-3" />
                    inscrit
                  </span>
                )}
              </span>
              <span className="truncate text-xs font-bold text-muted-foreground">
                {formatDay(entry.addedAt)}
                {entry.note !== null && entry.note !== '' ? ` · ${entry.note}` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => remove.mutate(entry.email)}
              disabled={remove.isPending}
              aria-label={`Retirer ${entry.email} de la liste blanche`}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-cardinal/10 hover:text-cardinal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
