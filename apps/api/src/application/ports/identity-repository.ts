/**
 * Port de lecture de l'**identité** d'un apprenant (contexte « Identity & Access »).
 *
 * L'application ne connaît que ce contrat : donner un `userId`, obtenir les
 * informations publiques du compte. Se teste sans D1 ni Better Auth.
 */

/** Informations publiques d'un compte, telles que l'écran Profil les affiche. */
export interface UserIdentity {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  /** Date d'inscription, epoch ms. */
  readonly createdAt: number;
}

export interface IdentityRepository {
  /** Identité d'un apprenant, ou `null` si le compte est introuvable. */
  findById(userId: string): Promise<UserIdentity | null>;
}
