import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { account, session, user, verification } from '../infrastructure/db/auth-schema.js';

/** Paramètres d'exécution de Better Auth, injectés par le point d'entrée. */
export interface AuthOptions {
  /** Secret de signature (jamais en dur — vient de `.dev.vars` / secret Worker). */
  readonly secret: string;
  /** URL publique de l'API (base des routes `/api/auth/*`). */
  readonly baseURL: string;
  /** Origines autorisées à porter une session (le front). */
  readonly trustedOrigins: readonly string[];
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
    // Point d'extension : `socialProviders: { google: {...} }` ajoutera l'OAuth
    // plus tard sans toucher au schéma ni aux routes (cf. table `account`).
  });
}

/** Type de l'instance Better Auth construite par `createAuth`. */
export type Auth = ReturnType<typeof createAuth>;
