'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Client Better Auth du navigateur.
 *
 * `baseURL` pointe sur le Worker (mêmes routes `/api/auth/*` qu'en back). Le
 * client envoie les cookies de session (`credentials: 'include'`) ; le CORS du
 * Worker les autorise (origine précise + credentials).
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787',
});

export const { signIn, signUp, signOut, useSession } = authClient;
