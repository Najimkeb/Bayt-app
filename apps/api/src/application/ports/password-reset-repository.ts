/**
 * Ports de la **réinitialisation de mot de passe par l'admin**.
 *
 * Le jeton est à usage unique et à durée limitée ; sa vérification (valide, non
 * expiré, non utilisé) est entièrement côté serveur. Le mot de passe n'est
 * jamais lu : seul son **hachage** (compatible Better Auth) est écrit.
 */

/** Un jeton de réinitialisation persisté. */
export interface ResetTokenRecord {
  readonly token: string;
  readonly userId: string;
  readonly expiresAt: number;
  readonly usedAt: number | null;
  readonly createdAt: number;
}

export interface PasswordResetTokenRepository {
  create(record: ResetTokenRecord): Promise<void>;
  findByToken(token: string): Promise<ResetTokenRecord | null>;
  /** Marque le jeton consommé (usage unique). */
  markUsed(token: string, usedAt: number): Promise<void>;
}

/**
 * Écriture du **hachage** du mot de passe sur le compte e-mail/mot de passe.
 *
 * Le hachage est produit par la même fonction que Better Auth (`hashPassword`
 * de `better-auth/crypto`) : la connexion (`verifyPassword`) l'accepte.
 */
export interface CredentialRepository {
  /** Met à jour le hachage ; `false` si aucun compte « credential » n'existe. */
  setPassword(userId: string, passwordHash: string, now: number): Promise<boolean>;
}
