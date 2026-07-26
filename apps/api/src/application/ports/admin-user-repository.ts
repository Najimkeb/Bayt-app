/**
 * Port d'administration des **comptes** (contexte « Identity & Access »).
 *
 * Lecture de la liste des inscrits et révocation des sessions. Ne supprime
 * jamais un compte : révoquer = retirer l'accès (liste blanche) + fermer les
 * sessions ouvertes.
 */

/** Un compte inscrit, vu par l'admin. */
export interface AdminUserRow {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: string;
  readonly createdAt: number;
  /** Dernière activité (session la plus récente), epoch ms, ou `null`. */
  readonly lastActiveAt: number | null;
}

export interface AdminUserRepository {
  /** Comptes inscrits, du plus récent au plus ancien. */
  listUsers(): Promise<readonly AdminUserRow[]>;

  /** Ferme toutes les sessions d'un apprenant (déconnexion forcée). */
  deleteSessions(userId: string): Promise<void>;
}
