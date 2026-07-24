'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Client Better Auth du navigateur.
 *
 * En prod, `NEXT_PUBLIC_API_URL` vaut `/api` (montage même origine) : le client
 * appelle `/api/api/auth/*` sur l'origine du front, que le proxy Next relaie
 * vers le Worker API (`/api/auth/*`). Le cookie de session est donc **first-party**
 * sur l'hôte du front. En local, la valeur est l'URL absolue du Worker
 * (`http://localhost:8787`), sans proxy.
 *
 * Better Auth attend une `baseURL` **absolue** : on résout un chemin relatif en
 * absolu côté navigateur (l'auth ne s'exécute jamais côté serveur).
 */
function resolveBaseURL(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
  if (configured.startsWith('http')) {
    return configured;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${configured}`;
  }

  // Rendu serveur : valeur factice absolue, jamais utilisée pour une requête réelle.
  return `http://localhost${configured}`;
}

export const authClient = createAuthClient({ baseURL: resolveBaseURL() });

export const { signIn, signUp, signOut, useSession } = authClient;
