import { Scheduler } from '@bayt/domain';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/http/app.js';
import type { UserIdentity } from '../../src/application/ports/identity-repository.js';
import { InMemoryIdentityRepository } from '../../src/infrastructure/repositories/in-memory-identity.repository.js';
import { InMemoryProfileStatsRepository } from '../../src/infrastructure/repositories/in-memory-profile-stats.repository.js';
import { InMemoryProgressRepository } from '../../src/infrastructure/repositories/in-memory-progress.repository.js';
import { InMemoryReviewRepository } from '../../src/infrastructure/repositories/in-memory-review.repository.js';
import { alwaysUser } from '../support/session.js';

const NOW = new Date('2026-03-15T12:00:00Z');

const IDENTITY: UserIdentity = {
  id: 'demo',
  name: 'Najim',
  email: 'najim@example.com',
  role: 'user',
  createdAt: Date.parse('2026-01-01T00:00:00Z'),
};

function build(options: { identity?: UserIdentity[] } = {}) {
  const progress = new InMemoryProgressRepository();
  const app = createApp({
    repository: new InMemoryReviewRepository(),
    progressRepository: progress,
    identityRepository: new InMemoryIdentityRepository(options.identity ?? [IDENTITY]),
    profileStatsRepository: new InMemoryProfileStatsRepository({
      memoryHealth: { newCount: 4, learning: 1, review: 3, relearning: 0, total: 8 },
      lessonsCompleted: 2,
      domainMastery: [],
      reviewEvents: [],
    }),
    scheduler: new Scheduler(),
    sessionVerifier: alwaysUser('demo'),
    clock: () => NOW,
  });

  return { app, progress };
}

describe('GET /profile', () => {
  it('renvoie le profil agrégé', async () => {
    const { app } = build();
    const response = await app.request('/profile?timezone=UTC');

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      user: { name: string; isAdmin: boolean };
      stats: { cardsMastered: number };
      memoryHealth: { total: number };
    };
    expect(body.user.name).toBe('Najim');
    expect(body.user.isAdmin).toBe(false);
    expect(body.stats.cardsMastered).toBe(3);
    expect(body.memoryHealth.total).toBe(8);
  });

  it('expose le lien admin selon le rôle en base', async () => {
    const { app } = build({ identity: [{ ...IDENTITY, role: 'admin' }] });
    const body = (await (await app.request('/profile?timezone=UTC')).json()) as {
      user: { isAdmin: boolean };
    };
    expect(body.user.isAdmin).toBe(true);
  });

  it('renvoie 404 si le compte est introuvable', async () => {
    const { app } = build({ identity: [] });
    expect((await app.request('/profile?timezone=UTC')).status).toBe(404);
  });
});

describe('POST /progress/goal', () => {
  const setGoal = (app: ReturnType<typeof build>['app'], body: unknown): Promise<Response> =>
    Promise.resolve(
      app.request('/progress/goal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  it('met à jour l’objectif quotidien et le persiste', async () => {
    const { app, progress } = build();
    const response = await setGoal(app, { dailyGoal: 80, timezone: 'UTC' });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { dailyGoal: number };
    expect(body.dailyGoal).toBe(80);
    expect((await progress.find('demo'))?.dailyGoal).toBe(80);
  });

  it('rejette un objectif hors bornes', async () => {
    const { app } = build();
    expect((await setGoal(app, { dailyGoal: 5, timezone: 'UTC' })).status).toBe(400);
    expect((await setGoal(app, { dailyGoal: 5000, timezone: 'UTC' })).status).toBe(400);
  });
});

describe('sans repositories de profil', () => {
  it('ne monte pas la route /profile', async () => {
    const app = createApp({
      repository: new InMemoryReviewRepository(),
      scheduler: new Scheduler(),
      sessionVerifier: alwaysUser('demo'),
    });
    expect((await app.request('/profile?timezone=UTC')).status).toBe(404);
  });
});
