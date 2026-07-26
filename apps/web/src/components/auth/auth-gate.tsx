'use client';

import { Mascot } from '@bayt/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactElement, type ReactNode } from 'react';

import { useSession } from '@/lib/auth/client';

/** Routes accessibles sans session. */
const PUBLIC_ROUTES = new Set(['/login', '/signup', '/reset-password']);

/** Routes réservées aux visiteurs : un connecté y est renvoyé à l'accueil. */
const GUEST_ONLY_ROUTES = new Set(['/login', '/signup']);

/**
 * Protège les routes : redirige vers `/login` sans session valide, et renvoie à
 * l'accueil un utilisateur déjà connecté qui atterrit sur `/login` ou `/signup`.
 *
 * Rien de protégé ne s'affiche tant que la session n'est pas résolue : les
 * écrans (et leurs requêtes) ne montent qu'avec un apprenant connu.
 */
export function AuthGate({ children }: { children: ReactNode }): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const isPublic = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    if (isPending) {
      return;
    }
    if (!isPublic && session === null) {
      router.replace('/login');
    } else if (GUEST_ONLY_ROUTES.has(pathname) && session !== null) {
      router.replace('/');
    }
  }, [isPending, isPublic, pathname, session, router]);

  // Pages publiques : toujours affichées (le formulaire de connexion lui-même).
  if (isPublic) {
    return <>{children}</>;
  }

  // Route protégée : on attend la session ; sans elle, on masque le temps de la
  // redirection (jamais de contenu privé affiché à un visiteur non connecté).
  if (isPending || session === null) {
    return <AuthLoading />;
  }

  return <>{children}</>;
}

/** Écran d'attente pendant la résolution de session. */
function AuthLoading(): ReactElement {
  return (
    <div className="flex flex-col items-center gap-4" aria-busy="true" aria-live="polite">
      <Mascot mood="idle" size="md" priority />
      <span className="sr-only">Chargement de ta session…</span>
    </div>
  );
}
