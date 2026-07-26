/**
 * Port de la **liste blanche d'inscription** (contexte « Identity & Access »).
 *
 * BAYT est sur invitation : seul un e-mail présent ici peut s'inscrire **et** se
 * connecter. Retirer une entrée révoque l'accès. Toute la vérification vit
 * côté serveur.
 */

/** Une entrée de la liste blanche. */
export interface AllowedEmail {
  readonly email: string;
  readonly addedAt: number;
  readonly note: string | null;
}

export interface AccessRepository {
  /** L'e-mail est-il autorisé ? (comparaison insensible à la casse). */
  isAllowed(email: string): Promise<boolean>;

  /** Toutes les entrées, de la plus récente à la plus ancienne. */
  list(): Promise<readonly AllowedEmail[]>;

  /** Ajoute (ou met à jour la note d') un e-mail autorisé. */
  add(email: string, note: string | null, now: number): Promise<void>;

  /** Retire un e-mail (révoque l'accès). */
  remove(email: string): Promise<void>;
}
