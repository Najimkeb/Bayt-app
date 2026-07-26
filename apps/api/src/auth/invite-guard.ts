import { APIError } from 'better-auth/api';

/**
 * Garde d'**invitation** : BAYT n'accepte que les e-mails de la liste blanche,
 * à l'inscription **et** à la connexion (pour pouvoir révoquer un accès).
 *
 * Logique pure et testable, appelée depuis le hook Better Auth (`auth.ts`).
 */

/** Chemins d'auth soumis à la liste blanche (inscription + connexion e-mail). */
const GATED_PATHS = new Set(['/sign-up/email', '/sign-in/email']);

/** Ce chemin d'auth doit-il vérifier l'invitation ? */
export function isGatedAuthPath(path: string): boolean {
  return GATED_PATHS.has(path);
}

/** Message bienveillant renvoyé à un e-mail non invité. */
export const NOT_INVITED_MESSAGE =
  'BAYT est sur invitation pour l’instant. Demande un accès à ton administrateur.';

/**
 * Lève une `APIError` 403 si l'e-mail n'est pas autorisé.
 *
 * Sans e-mail dans le corps, on laisse Better Auth appliquer ses propres
 * validations (l'invitation ne peut se juger sans e-mail).
 */
export async function ensureInvited(
  email: string | undefined,
  isAllowed: (email: string) => Promise<boolean>,
): Promise<void> {
  if (email === undefined || email === '') {
    return;
  }

  if (await isAllowed(email)) {
    return;
  }

  throw new APIError('FORBIDDEN', { message: NOT_INVITED_MESSAGE, code: 'NOT_INVITED' });
}
