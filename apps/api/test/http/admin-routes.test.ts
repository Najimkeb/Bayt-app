import { Scheduler } from '@bayt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/http/app.js';
import type { UserIdentity } from '../../src/application/ports/identity-repository.js';
import type { AdminUserRow } from '../../src/application/ports/admin-user-repository.js';
import { InMemoryAccessRepository } from '../../src/infrastructure/repositories/in-memory-access.repository.js';
import { InMemoryAdminUserRepository } from '../../src/infrastructure/repositories/in-memory-admin-user.repository.js';
import { InMemoryIdentityRepository } from '../../src/infrastructure/repositories/in-memory-identity.repository.js';
import {
  InMemoryCredentialRepository,
  InMemoryPasswordResetTokenRepository,
} from '../../src/infrastructure/repositories/in-memory-password-reset.repository.js';
import { InMemoryReviewRepository } from '../../src/infrastructure/repositories/in-memory-review.repository.js';
import { authAs, bearerVerifier } from '../support/session.js';

const NOW = new Date('2026-03-15T12:00:00Z');

const ADMIN: UserIdentity = { id: 'admin1', name: 'Chef', email: 'admin@bayt.app', role: 'admin', createdAt: 0 };
const MEMBER: UserIdentity = { id: 'user2', name: 'Membre', email: 'membre@bayt.app', role: 'user', createdAt: 0 };

const USERS: AdminUserRow[] = [
  { id: 'admin1', email: 'admin@bayt.app', name: 'Chef', role: 'admin', createdAt: 10, lastActiveAt: 99 },
  { id: 'user2', email: 'membre@bayt.app', name: 'Membre', role: 'user', createdAt: 5, lastActiveAt: null },
];

let access: InMemoryAccessRepository;
let admin: InMemoryAdminUserRepository;
let tokens: InMemoryPasswordResetTokenRepository;
let credentials: InMemoryCredentialRepository;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  access = new InMemoryAccessRepository(['admin@bayt.app', 'membre@bayt.app']);
  admin = new InMemoryAdminUserRepository(USERS);
  tokens = new InMemoryPasswordResetTokenRepository();
  credentials = new InMemoryCredentialRepository(new Set(['user2']));

  app = createApp({
    repository: new InMemoryReviewRepository(),
    identityRepository: new InMemoryIdentityRepository([ADMIN, MEMBER]),
    accessRepository: access,
    adminUserRepository: admin,
    passwordResetTokenRepository: tokens,
    credentialRepository: credentials,
    passwordHasher: (pw) => Promise.resolve(`hashed:${pw}`),
    webOrigin: 'https://app.test',
    scheduler: new Scheduler(),
    sessionVerifier: bearerVerifier(),
    clock: () => NOW,
  });
});

const asAdmin = () => ({ headers: authAs('admin1') });
const post = (path: string, body: unknown, userId: string): Promise<Response> =>
  Promise.resolve(
    app.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authAs(userId) },
      body: JSON.stringify(body),
    }),
  );

describe('garde de rôle /admin/*', () => {
  it('refuse un non-admin (403)', async () => {
    const response = await app.request('/admin/users', { headers: authAs('user2') });
    expect(response.status).toBe(403);
  });

  it('refuse une requête sans session (401)', async () => {
    expect((await app.request('/admin/users')).status).toBe(401);
  });

  it('laisse passer un admin', async () => {
    expect((await app.request('/admin/users', asAdmin())).status).toBe(200);
  });
});

describe('liste blanche', () => {
  it('liste, ajoute et retire un e-mail', async () => {
    const added = await post('/admin/allowed-emails', { email: 'Nouveau@Bayt.app', note: 'ami' }, 'admin1');
    expect(added.status).toBe(201);

    expect(await access.isAllowed('nouveau@bayt.app')).toBe(true);

    const removed = await app.request('/admin/allowed-emails/nouveau@bayt.app', {
      method: 'DELETE',
      headers: authAs('admin1'),
    });
    expect(removed.status).toBe(200);
    expect(await access.isAllowed('nouveau@bayt.app')).toBe(false);
  });
});

describe('gestion des utilisateurs', () => {
  it('liste les comptes', async () => {
    const body = (await (await app.request('/admin/users', asAdmin())).json()) as {
      users: { id: string }[];
    };
    expect(body.users).toHaveLength(2);
  });

  it('génère un lien de réinitialisation (jamais un mot de passe)', async () => {
    const response = await post('/admin/users/user2/reset-token', {}, 'admin1');
    expect(response.status).toBe(201);

    const body = (await response.json()) as { link: string; expiresAt: number };
    expect(body.link).toMatch(/^https:\/\/app\.test\/reset-password\?token=/);
    expect(body.expiresAt).toBeGreaterThan(NOW.getTime());
    // La réponse ne porte qu'un lien : aucun champ mot de passe.
    expect(Object.keys(body)).toEqual(['link', 'expiresAt']);
  });

  it('révoque un accès : e-mail retiré + sessions fermées', async () => {
    const response = await post('/admin/users/user2/revoke', {}, 'admin1');
    expect(response.status).toBe(200);

    expect(await access.isAllowed('membre@bayt.app')).toBe(false);
    expect(admin.revoked.has('user2')).toBe(true);
  });
});

describe('POST /reset-password (public)', () => {
  const reset = (body: unknown): Promise<Response> =>
    Promise.resolve(
      app.request('/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  it('définit un nouveau mot de passe avec un jeton valide', async () => {
    await tokens.create({ token: 'good', userId: 'user2', expiresAt: NOW.getTime() + 1000, usedAt: null, createdAt: 0 });

    const response = await reset({ token: 'good', newPassword: 'motdepasse1' });
    expect(response.status).toBe(200);
    expect(credentials.passwords.get('user2')).toBe('hashed:motdepasse1');
  });

  it('rejette un jeton expiré (400)', async () => {
    await tokens.create({ token: 'old', userId: 'user2', expiresAt: NOW.getTime() - 1, usedAt: null, createdAt: 0 });

    const response = await reset({ token: 'old', newPassword: 'motdepasse1' });
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toBe('token_expired');
  });

  it('valide la longueur du mot de passe', async () => {
    expect((await reset({ token: 'x', newPassword: 'court' })).status).toBe(400);
  });
});
