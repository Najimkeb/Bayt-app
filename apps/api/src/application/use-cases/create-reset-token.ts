import type { IdentityRepository } from '../ports/identity-repository.js';
import type { PasswordResetTokenRepository } from '../ports/password-reset-repository.js';

/** Durée de validité d'un jeton de réinitialisation (1 heure). */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Un lien de réinitialisation prêt à transmettre. */
export interface ResetTokenResult {
  readonly token: string;
  readonly expiresAt: number;
}

/**
 * Cas d'usage « l'admin génère un lien de réinitialisation pour un compte ».
 *
 * Produit un jeton à usage unique et à durée limitée, persisté côté serveur.
 * L'admin transmet ensuite le lien manuellement — aucun e-mail, aucun mot de
 * passe en clair.
 */
export class CreateResetToken {
  public constructor(
    private readonly tokens: PasswordResetTokenRepository,
    private readonly identity: IdentityRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
    private readonly ttlMs: number = RESET_TOKEN_TTL_MS,
  ) {}

  public async execute(userId: string): Promise<ResetTokenResult | null> {
    const identity = await this.identity.findById(userId);
    if (identity === null) {
      return null;
    }

    const now = this.clock().getTime();
    const token = this.newId();

    await this.tokens.create({
      token,
      userId,
      expiresAt: now + this.ttlMs,
      usedAt: null,
      createdAt: now,
    });

    return { token, expiresAt: now + this.ttlMs };
  }
}
