import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { account, session, user, verification } from '../infrastructure/db/auth-schema.js';
import { ensureInvited, isGatedAuthPath } from './invite-guard.js';

/** Paramètres d'exécution de Better Auth, injectés par le point d'entrée. */
export interface AuthOptions {
  /** Secret de signature (jamais en dur — vient de `.dev.vars` / secret Worker). */
  readonly secret: string;
  /** URL publique de l'API (base des routes `/api/auth/*`). */
  readonly baseURL: string;
  /** Origines autorisées à porter une session (le front). */
  readonly trustedOrigins: readonly string[];
  /**
   * Domaine du cookie de session, pour le **partager entre sous-domaines**
   * (`.bayt.app` → couvre `bayt.app` et `api.bayt.app`). Absent en local
   * (localhost) : le cookie reste alors sur l'hôte courant.
   */
  readonly cookieDomain?: string;
  /**
   * Vérifie qu'un e-mail est autorisé (liste blanche). Branché sur les hooks
   * d'inscription **et** de connexion. Absent (tests) → tout e-mail est accepté.
   */
  readonly isEmailAllowed?: (email: string) => Promise<boolean>;
}

/**
 * Construit l'instance Better Auth **pour une requête**.
 *
 * D1 n'expose pas d'adaptateur direct : on passe par `drizzleAdapter(db,
 * { provider: 'sqlite' })`. Le binding D1 n'existant que dans le contexte de la
 * requête, cette fabrique n'est **jamais** appelée au niveau module — toujours
 * depuis le handler, avec l'unique instance Drizzle de la requête.
 */
export function createAuth(db: DrizzleD1Database, options: AuthOptions) {
  return betterAuth({
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: [...options.trustedOrigins],
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      // Aucun service d'e-mail n'est encore branché : exiger la vérification
      // empêcherait toute connexion. À réactiver quand l'envoi sera en place.
      requireEmailVerification: false,
    },
    // Liste blanche : inscription ET connexion réservées aux e-mails invités.
    // Sans vérificateur fourni (tests), le hook laisse tout passer.
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (options.isEmailAllowed === undefined || !isGatedAuthPath(ctx.path)) {
          return;
        }

        const body = ctx.body as { email?: unknown } | undefined;
        const email = typeof body?.email === 'string' ? body.email : undefined;

        await ensureInvited(email, options.isEmailAllowed);
      }),
    },
    advanced: {
      // Front et API sur deux sous-domaines : le cookie doit porter le domaine
      // racine (`.bayt.app`) pour être envoyé aux deux. En prod, `baseURL` est
      // en HTTPS → Better Auth pose automatiquement `Secure` ; `SameSite=Lax`
      // (défaut) suffit car les deux sous-domaines sont *same-site*. En local
      // (pas de `cookieDomain`), le cookie reste sur l'hôte, sans `Secure`.
      ...(options.cookieDomain !== undefined
        ? { crossSubDomainCookies: { enabled: true, domain: options.cookieDomain } }
        : {}),
    },
    // Point d'extension : `socialProviders: { google: {...} }` ajoutera l'OAuth
    // plus tard sans toucher au schéma ni aux routes (cf. table `account`).
  });
}

/** Type de l'instance Better Auth construite par `createAuth`. */
export type Auth = ReturnType<typeof createAuth>;
