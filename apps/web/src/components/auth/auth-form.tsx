'use client';

import { Button, Mascot } from '@bayt/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent, type ReactElement } from 'react';

import { signIn, signUp } from '@/lib/auth/client';

/** Longueur minimale du mot de passe (défaut Better Auth). */
const MIN_PASSWORD = 8;

type Mode = 'login' | 'signup';

const COPY: Record<Mode, { title: string; cta: string; alt: string; altHref: string; altLabel: string }> = {
  login: {
    title: 'Content de te revoir',
    cta: 'Se connecter',
    alt: 'Pas encore de compte ?',
    altHref: '/signup',
    altLabel: 'Créer un compte',
  },
  signup: {
    title: 'Bienvenue chez BAYT',
    cta: 'Créer mon compte',
    alt: 'Tu as déjà un compte ?',
    altHref: '/login',
    altLabel: 'Se connecter',
  },
};

/**
 * Formulaire d'authentification (connexion **ou** inscription).
 *
 * Style Duolingo, mobile-first, accessible : chaque champ a un `<label>` lié,
 * les erreurs sont annoncées (`role="alert"`), et les attributs `autocomplete`
 * aident les gestionnaires de mots de passe. La logique passe par le client
 * Better Auth ; aucun mot de passe ne transite par notre code au-delà du POST.
 */
export function AuthForm({ mode }: { mode: Mode }): ReactElement {
  const router = useRouter();
  const copy = COPY[mode];
  const ids = useId();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result =
      mode === 'signup'
        ? await signUp.email({ name, email, password })
        : await signIn.email({ email, password });

    if (result.error) {
      setPending(false);
      setError(authErrorMessage(result.error));

      return;
    }

    // Session posée (cookie) : l'AuthGate laissera passer, on rejoint l'accueil.
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <Mascot mood={mode === 'signup' ? 'encouraging' : 'idle'} size="lg" priority />

      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-black">{copy.title}</h1>
        <p className="text-sm font-bold text-muted-foreground">
          {mode === 'signup'
            ? 'Quelques secondes, et ta mémoire se met au travail.'
            : 'Reprends là où tu t’es arrêté.'}
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-4">
        {mode === 'signup' && (
          <Field
            id={`${ids}-name`}
            label="Prénom"
            type="text"
            autoComplete="name"
            value={name}
            onChange={setName}
            required
          />
        )}

        <Field
          id={`${ids}-email`}
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={setEmail}
          required
        />

        <Field
          id={`${ids}-password`}
          label="Mot de passe"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={setPassword}
          minLength={MIN_PASSWORD}
          hint={mode === 'signup' ? `Au moins ${String(MIN_PASSWORD)} caractères.` : undefined}
          required
        />

        {error !== null && (
          <p
            role="alert"
            className="rounded-[var(--radius-button)] border-2 border-cardinal/40 bg-cardinal/10 px-4 py-2.5 text-sm font-bold text-cardinal"
          >
            {error}
          </p>
        )}

        <Button type="submit" variant="green" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? 'Un instant…' : copy.cta}
        </Button>
      </form>

      <p className="text-sm font-bold text-muted-foreground">
        {copy.alt}{' '}
        <Link href={copy.altHref} className="font-extrabold text-macaw underline underline-offset-2">
          {copy.altLabel}
        </Link>
      </p>
    </div>
  );
}

/** Un champ de formulaire étiqueté et accessible. */
function Field({
  id,
  label,
  value,
  onChange,
  hint,
  ...input
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string | undefined;
  type: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  inputMode?: 'email' | 'text';
}): ReactElement {
  const hintId = hint !== undefined ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-extrabold">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hintId}
        className="w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 py-3 text-base font-bold text-foreground transition-colors focus-visible:border-macaw focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...input}
      />
      {hint !== undefined && (
        <span id={hintId} className="text-xs font-bold text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}

/** Erreur telle qu'exposée par le client Better Auth. */
interface AuthError {
  readonly code?: string | undefined;
  readonly message?: string | undefined;
  readonly status?: number | undefined;
}

/**
 * Traduit une erreur d'auth en message clair, en **distinguant** :
 * - identifiants incorrects (**401**) — sans jamais révéler si l'e-mail existe ;
 * - erreur serveur (**5xx**) ;
 * - serveur injoignable (réseau, statut 0/absent) ;
 * - cas connus (compte existant, mot de passe trop court…).
 */
function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'NOT_INVITED':
      return 'BAYT est sur invitation pour l’instant. Demande un accès à ton administrateur.';
    case 'USER_ALREADY_EXISTS':
      return 'Un compte existe déjà avec cet e-mail.';
    case 'PASSWORD_TOO_SHORT':
      return `Le mot de passe doit faire au moins ${String(MIN_PASSWORD)} caractères.`;
    case 'INVALID_EMAIL':
      return 'Cet e-mail n’est pas valide.';
    case 'INVALID_EMAIL_OR_PASSWORD':
      return 'E-mail ou mot de passe incorrect.';
  }

  const status = error.status;
  // 403 : e-mail non invité (liste blanche) — message bienveillant.
  if (status === 403) {
    return 'BAYT est sur invitation pour l’instant. Demande un accès à ton administrateur.';
  }
  // 401 : identifiants incorrects — message identique compte existant ou non.
  if (status === 401) {
    return 'E-mail ou mot de passe incorrect.';
  }
  if (status !== undefined && status >= 500) {
    return 'Erreur serveur — réessaie dans un instant.';
  }
  if (status === undefined || status === 0) {
    return 'Impossible de joindre le serveur. Vérifie ta connexion, puis réessaie.';
  }

  return 'Quelque chose n’a pas fonctionné. Réessaie.';
}
