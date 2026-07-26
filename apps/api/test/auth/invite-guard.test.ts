import { APIError } from 'better-auth/api';
import { describe, expect, it } from 'vitest';

import { ensureInvited, isGatedAuthPath } from '../../src/auth/invite-guard.js';

const allow = (allowed: readonly string[]) => (email: string) =>
  Promise.resolve(allowed.includes(email.toLowerCase()));

describe('isGatedAuthPath', () => {
  it('protège inscription et connexion e-mail', () => {
    expect(isGatedAuthPath('/sign-up/email')).toBe(true);
    expect(isGatedAuthPath('/sign-in/email')).toBe(true);
  });

  it('laisse passer les autres chemins (déconnexion, session…)', () => {
    expect(isGatedAuthPath('/sign-out')).toBe(false);
    expect(isGatedAuthPath('/get-session')).toBe(false);
  });
});

describe('ensureInvited', () => {
  it('laisse passer un e-mail autorisé', async () => {
    await expect(ensureInvited('ok@bayt.app', allow(['ok@bayt.app']))).resolves.toBeUndefined();
  });

  it('rejette un e-mail non autorisé avec une 403 bienveillante', async () => {
    let caught: unknown;
    try {
      await ensureInvited('intrus@example.com', allow(['ok@bayt.app']));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(APIError);
    expect((caught as APIError).status).toBe('FORBIDDEN');
    expect((caught as APIError).message).toMatch(/invitation/i);
  });

  it('ne juge pas sans e-mail (laisse Better Auth valider)', async () => {
    await expect(ensureInvited(undefined, allow([]))).resolves.toBeUndefined();
  });
});
