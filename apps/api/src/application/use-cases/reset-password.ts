import type {
  CredentialRepository,
  PasswordResetTokenRepository,
} from '../ports/password-reset-repository.js';

/** Jeton absent, déjà utilisé, ou sans compte cible : réinitialisation refusée. */
export class InvalidResetTokenError extends Error {
  public constructor() {
    super('Jeton de réinitialisation invalide.');
    this.name = 'InvalidResetTokenError';
  }
}

/** Jeton expiré : réinitialisation refusée. */
export class ExpiredResetTokenError extends Error {
  public constructor() {
    super('Jeton de réinitialisation expiré.');
    this.name = 'ExpiredResetTokenError';
  }
}

/**
 * Cas d'usage public « je définis un nouveau mot de passe avec mon jeton ».
 *
 * Vérifie **côté serveur** que le jeton est valide, non expiré et non utilisé,
 * puis écrit le **hachage** du nouveau mot de passe (jamais le clair) et invalide
 * le jeton (usage unique). Le hachage est délégué (fonction Better Auth) pour
 * rester testable et compatible avec la connexion.
 */
export class ResetPasswordWithToken {
  public constructor(
    private readonly tokens: PasswordResetTokenRepository,
    private readonly credentials: CredentialRepository,
    private readonly hashPassword: (password: string) => Promise<string>,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async execute(token: string, newPassword: string): Promise<void> {
    const record = await this.tokens.findByToken(token);
    if (record === null || record.usedAt !== null) {
      throw new InvalidResetTokenError();
    }

    const now = this.clock().getTime();
    if (record.expiresAt < now) {
      throw new ExpiredResetTokenError();
    }

    const hash = await this.hashPassword(newPassword);
    const applied = await this.credentials.setPassword(record.userId, hash, now);
    if (!applied) {
      // Aucun compte e-mail/mot de passe à mettre à jour : jeton inexploitable.
      throw new InvalidResetTokenError();
    }

    await this.tokens.markUsed(token, now);
  }
}
