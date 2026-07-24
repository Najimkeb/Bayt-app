'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Client Better Auth du navigateur.
 *
 * **Piège Better Auth** : la `baseURL` doit être l'**origine** du serveur, pas
 * un préfixe. Better Auth ajoute lui-même son `basePath` (`/api/auth`). Si on
 * passe `${origin}/api`, il interprète `/api` comme le basePath et appelle
 * `${origin}/api/sign-in/email` (sans `/api/auth`) → la garde d'auth répond 401.
 *
 * - **Prod (même origine)** : on donne l'origine du **front**. Better Auth appelle
 *   `${origin}/api/auth/*`, que le proxy (`app/api/[...path]`) conserve tel quel
 *   vers le Worker API. Cookie **first-party** sur l'hôte du front.
 * - **Local** : `NEXT_PUBLIC_API_URL` = URL absolue du Worker (`http://localhost:8787`),
 *   Better Auth y ajoute `/api/auth`, sans proxy.
 */
function resolveBaseURL(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
  // Local : URL absolue de l'API (Better Auth ajoutera `/api/auth`).
  if (configured.startsWith('http')) {
    return configured;
  }
  // Prod (chemin relatif) : l'ORIGINE du front, SANS suffixe — Better Auth ajoute
  // `/api/auth` et le proxy le conserve.
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Rendu serveur : valeur factice absolue, jamais utilisée pour une requête réelle.
  return 'http://localhost';
}

export const authClient = createAuthClient({ baseURL: resolveBaseURL() });

export const { signIn, signUp, signOut, useSession } = authClient;
