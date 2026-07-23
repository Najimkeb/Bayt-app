import type { SessionVerifier } from '../../src/http/session.js';

/**
 * Doubles de test du `SessionVerifier` — pas de Better Auth, pas de D1, pas de
 * crypto : la vérification de session est une frontière injectable.
 */

/** Vérificateur qui authentifie toujours le même apprenant (routes métier). */
export function alwaysUser(userId = 'demo'): SessionVerifier {
  return { verify: () => Promise.resolve(userId) };
}

/**
 * Vérificateur piloté par l'en-tête `Authorization: Bearer test:<userId>`.
 *
 * Sans en-tête valide → `null` (donc 401). Permet de simuler l'absence de
 * session et de basculer d'un apprenant à l'autre pour l'isolation des données.
 */
export function bearerVerifier(): SessionVerifier {
  return {
    verify: (headers: Headers) => {
      const match = /^Bearer test:(.+)$/.exec(headers.get('authorization') ?? '');

      return Promise.resolve(match?.[1] ?? null);
    },
  };
}

/** En-têtes d'une requête authentifiée pour `bearerVerifier`. */
export function authAs(userId: string): { Authorization: string } {
  return { Authorization: `Bearer test:${userId}` };
}
