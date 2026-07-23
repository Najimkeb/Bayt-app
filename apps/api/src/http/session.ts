import type { Auth } from '../auth/auth.js';

/**
 * Vérificateur de session — frontière étroite entre l'app HTTP et l'auth.
 *
 * L'application ne connaît que ce contrat : donner des en-têtes de requête,
 * obtenir l'identifiant de l'utilisateur authentifié (ou `null`). Cela garde
 * les routes indépendantes de Better Auth et **testables sans D1 ni crypto**
 * (un double de test renvoie un userId à partir d'un en-tête).
 */
export interface SessionVerifier {
  /** userId authentifié, ou `null` si la requête n'a pas de session valide. */
  verify(headers: Headers): Promise<string | null>;
}

/** Implémentation de production : délègue à Better Auth. */
export class BetterAuthSessionVerifier implements SessionVerifier {
  public constructor(private readonly auth: Auth) {}

  public async verify(headers: Headers): Promise<string | null> {
    const result = await this.auth.api.getSession({ headers });

    return result?.user.id ?? null;
  }
}
