import { Scheduler } from '@bayt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import type { DomainRow } from '../../src/application/ports/path-repository.js';
import { createApp } from '../../src/http/app.js';
import {
  InMemoryPathRepository,
  type InMemoryUnit,
} from '../../src/infrastructure/repositories/in-memory-path.repository.js';
import { alwaysUser } from '../support/session.js';
import { InMemoryReviewRepository } from '../../src/infrastructure/repositories/in-memory-review.repository.js';

const DOMAINS: readonly DomainRow[] = [
  {
    id: 'dom_x',
    name: 'Apprendre à apprendre',
    description: 'Les fondations de la mémorisation.',
    emoji: '🧠',
    color: 'green',
    position: 0,
  },
];

const UNITS: readonly InMemoryUnit[] = [
  {
    id: 'u1',
    domainId: 'dom_x',
    title: 'Fondamentaux',
    lessons: [
      { id: 'l1', title: 'Leçon 1' },
      { id: 'l2', title: 'Leçon 2' },
      { id: 'l3', title: 'Leçon 3' },
    ],
  },
];

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp({
    repository: new InMemoryReviewRepository(),
    pathRepository: new InMemoryPathRepository(DOMAINS, UNITS),
    scheduler: new Scheduler(),
    sessionVerifier: alwaysUser('demo'),
    clock: () => new Date('2026-03-01T12:00:00Z'),
  });
});

const path = async (domainId: string) =>
  (await (await app.request(`/path?domainId=${domainId}`)).json()) as {
    units: { title: string; lessons: { id: string; state: string }[] }[];
  };

describe('GET /domains', () => {
  it('renvoie le catalogue avec la progression du domaine', async () => {
    const body = (await (await app.request('/domains')).json()) as {
      domains: { id: string; name: string; lessonsCompleted: number; lessonsTotal: number }[];
    };

    expect(body.domains).toHaveLength(1);
    expect(body.domains[0]?.id).toBe('dom_x');
    expect(body.domains[0]?.lessonsTotal).toBe(3);
    expect(body.domains[0]?.lessonsCompleted).toBe(0);
  });
});

describe('GET /path', () => {
  it("renvoie les unités du domaine avec l'état des nœuds", async () => {
    const body = await path('dom_x');

    expect(body.units).toHaveLength(1);
    expect(body.units[0]?.title).toBe('Fondamentaux');
    expect(body.units[0]?.lessons.map((l) => l.state)).toEqual(['available', 'locked', 'locked']);
  });

  it('exige un domainId', async () => {
    expect((await app.request('/path')).status).toBe(400);
  });
});

describe('POST /lessons/:id/complete', () => {
  const complete = (lessonId: string): Promise<Response> =>
    Promise.resolve(
      app.request(`/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

  it('marque terminé et débloque la suivante', async () => {
    const response = await complete('l1');
    expect(response.status).toBe(201);

    const body = await path('dom_x');
    expect(body.units[0]?.lessons.map((l) => l.state)).toEqual([
      'completed',
      'available',
      'locked',
    ]);
  });

  it('est idempotent', async () => {
    await complete('l1');
    await complete('l1');

    const body = await path('dom_x');
    // Toujours une seule complétion → l2 disponible, pas l3.
    expect(body.units[0]?.lessons.map((l) => l.state)).toEqual([
      'completed',
      'available',
      'locked',
    ]);
  });
});

describe('sans pathRepository', () => {
  it('ne monte pas les routes /path', async () => {
    const bare = createApp({
      repository: new InMemoryReviewRepository(),
      scheduler: new Scheduler(),
      sessionVerifier: alwaysUser('demo'),
    });

    expect((await bare.request('/path?domainId=dom_x')).status).toBe(404);
    expect((await bare.request('/domains')).status).toBe(404);
  });
});
