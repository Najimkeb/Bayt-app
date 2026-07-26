/**
 * Contrat HTTP du panneau d'administration, vu du navigateur.
 *
 * Miroir des réponses `/admin/*` de l'API. Toute la vérification (rôle, liste
 * blanche, jeton) reste côté serveur : le front ne fait qu'afficher et demander.
 */

export interface AllowedEmail {
  readonly email: string;
  readonly addedAt: number;
  readonly note: string | null;
}

export interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: string;
  readonly createdAt: number;
  /** Dernière activité (session la plus récente), epoch ms, ou `null`. */
  readonly lastActiveAt: number | null;
}

/** Lien de réinitialisation à usage unique, à transmettre manuellement. */
export interface ResetLink {
  readonly link: string;
  readonly expiresAt: number;
}
