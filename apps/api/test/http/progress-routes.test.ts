import { Scheduler } from '@bayt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/http/app.js';
import { InMemoryProgressRepository } from '../../src/infrastructure/repositories/in-memory-progress.repository.js';
import { InMemoryReviewRepository } from '../../src/infrastructure/repositories/in-memory-review.repository.js';
import { alwaysUser } from '../support/session.js';

const NOW = new Date('2026-03-01T12:00:00Z');

let progress: InMemoryProgressRepository;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  progress = new InMemoryProgressRepository();
  app = createApp({
    repository: new InMemoryReviewRepository(),
    progressRepository: progress,
    scheduler: new Scheduler(),
    sessionVerifier: alwaysUser('demo'),
    clock: () => NOW,
  });
});

const increment = (body: unknown): Promise<Response> =>
  Promise.resolve(
    app.request('/progress/increment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

describe('GET /progress', () => {
  it('renvoie une progression vierge par défaut', async () => {
    const body = (await (await app.request('/progress?userId=demo&timezone=Europe/Paris')).json()) as {
      xpToday: number;
      streak: number;
      dailyGoal: number;
    };

    expect(body.xpToday).toBe(0);
    expect(body.streak).toBe(0);
    expect(body.dailyGoal).toBe(50);
  });

});

describe('POST /progress/increment', () => {
  it('accorde de l\'XP calculé par le domaine et le persiste', async () => {
    const response = await increment({
      userId: 'demo',
      event: { type: 'exercise', correct: true },
      timezone: 'Europe/Paris',
      at: NOW.toISOString(),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      xpGained: number;
      status: { xpToday: number };
    };
    expect(body.xpGained).toBe(10);
    expect(body.status.xpToday).toBe(10);

    // Persisté : une seconde lecture reflète le gain.
    const status = (await (await app.request('/progress?userId=demo&timezone=Europe/Paris')).json()) as {
      xpToday: number;
    };
    expect(status.xpToday).toBe(10);
  });

  it('n\'accorde rien pour un exercice raté', async () => {
    const body = (await (
      await increment({
        userId: 'demo',
        event: { type: 'exercise', correct: false },
        timezone: 'UTC',
        at: NOW.toISOString(),
      })
    ).json()) as { xpGained: number };

    expect(body.xpGained).toBe(0);
  });

  it('signale l\'atteinte de l\'objectif et la hausse de série', async () => {
    // Objectif par défaut 50 ; on l'atteint en cumulant.
    for (let i = 0; i < 4; i += 1) {
      await increment({
        userId: 'demo',
        event: { type: 'exercise', correct: true },
        timezone: 'UTC',
        at: NOW.toISOString(),
      });
    }

    const body = (await (
      await increment({
        userId: 'demo',
        event: { type: 'exercise', correct: true },
        timezone: 'UTC',
        at: NOW.toISOString(),
      })
    ).json()) as { goalJustReached: boolean; streakIncreased: boolean; status: { streak: number } };

    expect(body.goalJustReached).toBe(true);
    expect(body.streakIncreased).toBe(true);
    expect(body.status.streak).toBe(1);
  });

  it('valide le corps (zod)', async () => {
    expect((await increment({ userId: 'demo' })).status).toBe(400);
    expect(
      (await increment({ userId: 'demo', event: { type: 'nope' }, timezone: 'UTC' })).status,
    ).toBe(400);
  });
});

describe('sans progressRepository', () => {
  it('ne monte pas les routes /progress', async () => {
    const bare = createApp({
      repository: new InMemoryReviewRepository(),
      scheduler: new Scheduler(),
      sessionVerifier: alwaysUser('demo'),
    });

    expect((await bare.request('/progress?userId=demo')).status).toBe(404);
  });
});
