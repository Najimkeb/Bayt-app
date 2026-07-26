import { and, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  CredentialRepository,
  PasswordResetTokenRepository,
  ResetTokenRecord,
} from '../../application/ports/password-reset-repository.js';
import { account, passwordResetTokens } from '../db/schema.js';

/** Provider Better Auth de la méthode e-mail/mot de passe. */
const CREDENTIAL_PROVIDER = 'credential';

/** Implémentation D1 (via Drizzle) des jetons de réinitialisation. */
export class D1PasswordResetTokenRepository implements PasswordResetTokenRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async create(record: ResetTokenRecord): Promise<void> {
    await this.db.insert(passwordResetTokens).values(record);
  }

  public async findByToken(token: string): Promise<ResetTokenRecord | null> {
    const [row] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    return row === undefined ? null : row;
  }

  public async markUsed(token: string, usedAt: number): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt })
      .where(eq(passwordResetTokens.token, token));
  }
}

/** Implémentation D1 (via Drizzle) de l'écriture du hachage de mot de passe. */
export class D1CredentialRepository implements CredentialRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async setPassword(userId: string, passwordHash: string, now: number): Promise<boolean> {
    // Cible la ligne « credential » (e-mail/mot de passe) de l'utilisateur.
    const [existing] = await this.db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL_PROVIDER)))
      .limit(1);

    if (existing === undefined) {
      return false;
    }

    await this.db
      .update(account)
      .set({ password: passwordHash, updatedAt: new Date(now) })
      .where(and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL_PROVIDER)));

    return true;
  }
}
