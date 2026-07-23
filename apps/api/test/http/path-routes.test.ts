import { Scheduler } from '@bayt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import type { PathUnitRow } from '../../src/application/ports/path-repository.js';
import { assignNodeStates } from '../../src/application/use-cases/get-path.js';
import { createApp } from '../../src/http/app.js';
import { InMemoryPathRepository } from '../../src/infrastructure/repositories/in-memory-path.repository.js';
import { alwaysUser } from '../support/session.js';
import { InMemoryReviewRepository } from '../../src/infrastructure/repositories/in-memory-review.repository.js';

const UNITS: readonly PathUnitRow[] = [
  {
    id: 'u1',
    title: 'Fondamentaux',
    color: 'green',
    lessons: [
      { id: 'l1', title: 'Leçon 1' },
      { id: 'l2', title: 'Leçon 2' },
      { id: 'l3', title: 'Leçon 3' },
    ],
  },
];

describe('assignNodeStates (pur)', () => {
  it('rend la première leçon disponible, le reste verrouillé', () => {
    const [unit] = assignNodeStates(UNITS, new Set());
    expect(unit?.lessons.map((l) => l.state)).toEqual(['available', 'locked', 'locked']);
  });

  it('débloque la suivante quand la précédente est terminée', () => {
    const [unit] = assignNodeStates(UNITS, new Set(['l1']));
    expect(unit?.lessons.map((l) => l.state)).toEqual(['completed', 'available', 'locked']);
  });

  it('marque tout terminé quand tout est complété', () => {
    const [unit] = assignNodeStates(UNITS, new Set(['l1', 'l2', 'l3']));
    expect(unit?.lessons.map((l) => l.state)).toEqual(['completed', 'completed', 'completed']);
  });
});

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp({
    repository: new InMemoryReviewRepository(),
    pathRepository: new InMemoryPathRepository(UNITS),
    scheduler: new Scheduler(),
    sessionVerifier: alwaysUser('demo'),
    clock: () => new Date('2026-03-01T12:00:00Z'),
  });
});

describe('GET /path', () => {
  it('renvoie les unités avec l\'état des nœuds', async () => {
    const body = (await (await app.request('/path?userId=demo')).json()) as {
      units: { title: string; color: string; lessons: { id: string; state: string }[] }[];
    };

    expect(body.units).toHaveLength(1);
    expect(body.units[0]?.title).toBe('Fondamentaux');
    expect(body.units[0]?.lessons.map((l) => l.state)).toEqual([
      'available',
      'locked',
      'locked',
    ]);
  });

});

describe('POST /lessons/:id/complete', () => {
  const complete = (lessonId: string, body: unknown): Promise<Response> =>
    Promise.resolve(
      app.request(`/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  it('marque terminé et débloque la suivante', async () => {
    const response = await complete('l1', { userId: 'demo' });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      units: { lessons: { id: string; state: string }[] }[];
    };
    expect(body.units[0]?.lessons.map((l) => l.state)).toEqual([
      'completed',
      'available',
      'locked',
    ]);
  });

  it('est idempotent', async () => {
    await complete('l1', { userId: 'demo' });
    const body = (await (await complete('l1', { userId: 'demo' })).json()) as {
      units: { lessons: { state: string }[] }[];
    };
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

    expect((await bare.request('/path')).status).toBe(404);
  });
});
