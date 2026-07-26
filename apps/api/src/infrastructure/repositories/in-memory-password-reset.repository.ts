import type {
  CredentialRepository,
  PasswordResetTokenRepository,
  ResetTokenRecord,
} from '../../application/ports/password-reset-repository.js';

/** Implémentation en mémoire des jetons de réinitialisation (tests, sans D1). */
export class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
  readonly #byToken = new Map<string, ResetTokenRecord>();

  public constructor(records: readonly ResetTokenRecord[] = []) {
    for (const record of records) {
      this.#byToken.set(record.token, record);
    }
  }

  public create(record: ResetTokenRecord): Promise<void> {
    this.#byToken.set(record.token, record);

    return Promise.resolve();
  }

  public findByToken(token: string): Promise<ResetTokenRecord | null> {
    return Promise.resolve(this.#byToken.get(token) ?? null);
  }

  public markUsed(token: string, usedAt: number): Promise<void> {
    const record = this.#byToken.get(token);
    if (record !== undefined) {
      this.#byToken.set(token, { ...record, usedAt });
    }

    return Promise.resolve();
  }
}

/** Implémentation en mémoire de l'écriture du hachage (tests, sans D1). */
export class InMemoryCredentialRepository implements CredentialRepository {
  /** userId → hachage écrit (pour assertion de test). */
  public readonly passwords = new Map<string, string>();

  /** Utilisateurs disposant d'un compte « credential ». */
  public constructor(private readonly withCredential: ReadonlySet<string> = new Set()) {}

  public setPassword(userId: string, passwordHash: string): Promise<boolean> {
    if (!this.withCredential.has(userId)) {
      return Promise.resolve(false);
    }
    this.passwords.set(userId, passwordHash);

    return Promise.resolve(true);
  }
}
