import { describe, expect, it } from 'vitest';

import { CreateResetToken } from '../../src/application/use-cases/create-reset-token.js';
import {
  ExpiredResetTokenError,
  InvalidResetTokenError,
  ResetPasswordWithToken,
} from '../../src/application/use-cases/reset-password.js';
import type { ResetTokenRecord } from '../../src/application/ports/password-reset-repository.js';
import { InMemoryIdentityRepository } from '../../src/infrastructure/repositories/in-memory-identity.repository.js';
import {
  InMemoryCredentialRepository,
  InMemoryPasswordResetTokenRepository,
} from '../../src/infrastructure/repositories/in-memory-password-reset.repository.js';

const NOW = new Date('2026-03-15T12:00:00Z');
const now = NOW.getTime();
const hasher = (password: string): Promise<string> => Promise.resolve(`hashed:${password}`);

const identity = () =>
  new InMemoryIdentityRepository([
    { id: 'u1', name: 'Najim', email: 'najim@example.com', role: 'user', createdAt: 0 },
  ]);

function tokenRecord(overrides: Partial<ResetTokenRecord> = {}): ResetTokenRecord {
  return {
    token: 'tok-1',
    userId: 'u1',
    expiresAt: now + 60_000,
    usedAt: null,
    createdAt: now,
    ...overrides,
  };
}

describe('CreateResetToken', () => {
  it('génère un jeton daté pour un compte existant', async () => {
    const tokens = new InMemoryPasswordResetTokenRepository();
    const result = await new CreateResetToken(
      tokens,
      identity(),
      () => NOW,
      () => 'fixed-token',
      60_000,
    ).execute('u1');

    expect(result).toEqual({ token: 'fixed-token', expiresAt: now + 60_000 });
    const stored = await tokens.findByToken('fixed-token');
    expect(stored).toMatchObject({ userId: 'u1', usedAt: null });
  });

  it('renvoie null pour un compte inconnu', async () => {
    const result = await new CreateResetToken(
      new InMemoryPasswordResetTokenRepository(),
      identity(),
    ).execute('inconnu');

    expect(result).toBeNull();
  });
});

describe('ResetPasswordWithToken', () => {
  it('définit le mot de passe, puis invalide le jeton (usage unique)', async () => {
    const tokens = new InMemoryPasswordResetTokenRepository([tokenRecord()]);
    const credentials = new InMemoryCredentialRepository(new Set(['u1']));

    await new ResetPasswordWithToken(tokens, credentials, hasher, () => NOW).execute(
      'tok-1',
      'nouveau-mot-de-passe',
    );

    expect(credentials.passwords.get('u1')).toBe('hashed:nouveau-mot-de-passe');
    // Jeton consommé : un second usage échoue.
    expect((await tokens.findByToken('tok-1'))?.usedAt).toBe(now);
  });

  it('rejette un jeton expiré', async () => {
    const tokens = new InMemoryPasswordResetTokenRepository([
      tokenRecord({ expiresAt: now - 1 }),
    ]);
    const credentials = new InMemoryCredentialRepository(new Set(['u1']));

    await expect(
      new ResetPasswordWithToken(tokens, credentials, hasher, () => NOW).execute('tok-1', 'x'.repeat(8)),
    ).rejects.toBeInstanceOf(ExpiredResetTokenError);
    // Rien n'a été écrit.
    expect(credentials.passwords.size).toBe(0);
  });

  it('rejette un jeton déjà utilisé', async () => {
    const tokens = new InMemoryPasswordResetTokenRepository([tokenRecord({ usedAt: now - 1000 })]);

    await expect(
      new ResetPasswordWithToken(
        tokens,
        new InMemoryCredentialRepository(new Set(['u1'])),
        hasher,
        () => NOW,
      ).execute('tok-1', 'x'.repeat(8)),
    ).rejects.toBeInstanceOf(InvalidResetTokenError);
  });

  it('rejette un jeton inconnu', async () => {
    await expect(
      new ResetPasswordWithToken(
        new InMemoryPasswordResetTokenRepository(),
        new InMemoryCredentialRepository(new Set(['u1'])),
        hasher,
        () => NOW,
      ).execute('absent', 'x'.repeat(8)),
    ).rejects.toBeInstanceOf(InvalidResetTokenError);
  });

  it('rejette si aucun compte e-mail/mot de passe n’existe', async () => {
    const tokens = new InMemoryPasswordResetTokenRepository([tokenRecord()]);
    // Aucun utilisateur avec compte « credential ».
    const credentials = new InMemoryCredentialRepository(new Set());

    await expect(
      new ResetPasswordWithToken(tokens, credentials, hasher, () => NOW).execute('tok-1', 'x'.repeat(8)),
    ).rejects.toBeInstanceOf(InvalidResetTokenError);
    expect((await tokens.findByToken('tok-1'))?.usedAt).toBeNull();
  });
});
