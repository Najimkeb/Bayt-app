'use client';

import { Button, Mascot } from '@bayt/ui';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useId, useState, type FormEvent, type ReactElement } from 'react';

import { ApiError, resetPassword } from '@/lib/api/client';

/** Longueur minimale du mot de passe (défaut Better Auth). */
const MIN_PASSWORD = 8;

/** Traduit le code d'erreur serveur en message clair. */
function messageForCode(error: ApiError): string {
  switch (error.message) {
    case 'token_expired':
      return 'Ce lien a expiré. Demande un nouveau lien à ton administrateur.';
    case 'token_invalid':
      return 'Ce lien n’est plus valide (déjà utilisé ou incorrect).';
    case 'invalid_request':
      return `Le mot de passe doit faire au moins ${String(MIN_PASSWORD)} caractères.`;
  }

  if (error.status === 0) {
    return 'Impossible de joindre le serveur. Vérifie ta connexion, puis réessaie.';
  }

  return 'Quelque chose n’a pas fonctionné. Réessaie.';
}

/**
 * Écran public de réinitialisation de mot de passe.
 *
 * Le jeton vient de l'URL (`?token=`) ; sa validité (non expiré, non utilisé)
 * est jugée **côté serveur** à la soumission. Aucun mot de passe n'est jamais
 * affiché ; on ne révèle rien du compte.
 */
export function ResetPasswordForm(): ReactElement {
  const ids = useId();
  const token = useSearchParams().get('token') ?? '';

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (token === '') {
    return (
      <Feedback
        mood="idle"
        title="Lien invalide"
        body="Ce lien de réinitialisation est incomplet. Demande-en un nouveau à ton administrateur."
      />
    );
  }

  if (done) {
    return (
      <Feedback
        mood="celebrating"
        title="Mot de passe mis à jour"
        body="Tu peux maintenant te connecter avec ton nouveau mot de passe."
        cta={{ href: '/login', label: 'Se connecter' }}
      />
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? messageForCode(caught) : 'Réessaie dans un instant.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <Mascot mood="encouraging" size="lg" priority />
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-black">Nouveau mot de passe</h1>
        <p className="text-sm font-bold text-muted-foreground">
          Choisis un nouveau mot de passe pour ton compte.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${ids}-pw`} className="text-sm font-extrabold">
            Mot de passe
          </label>
          <input
            id={`${ids}-pw`}
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={`${ids}-hint`}
            className="w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 py-3 text-base font-bold text-foreground focus-visible:border-macaw focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span id={`${ids}-hint`} className="text-xs font-bold text-muted-foreground">
            Au moins {MIN_PASSWORD} caractères.
          </span>
        </div>

        {error !== null && (
          <p
            role="alert"
            className="rounded-[var(--radius-button)] border-2 border-cardinal/40 bg-cardinal/10 px-4 py-2.5 text-sm font-bold text-cardinal"
          >
            {error}
          </p>
        )}

        <Button type="submit" variant="brand" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? 'Un instant…' : 'Enregistrer'}
        </Button>
      </form>

      <Link href="/login" className="text-sm font-extrabold text-macaw underline underline-offset-2">
        Retour à la connexion
      </Link>
    </div>
  );
}

/** Écran de résultat (lien invalide / succès). */
function Feedback({
  mood,
  title,
  body,
  cta,
}: {
  mood: 'idle' | 'celebrating';
  title: string;
  body: string;
  cta?: { href: string; label: string };
}): ReactElement {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
      <Mascot mood={mood} size="lg" priority />
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="text-base font-bold leading-relaxed text-muted-foreground">{body}</p>
      <Link
        href={cta?.href ?? '/login'}
        className="font-extrabold text-macaw underline underline-offset-2"
      >
        {cta?.label ?? 'Retour à la connexion'}
      </Link>
    </div>
  );
}
