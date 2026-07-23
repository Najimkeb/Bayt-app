import { Scheduler } from '@bayt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import type { LearningItemView } from '../../src/application/ports/review-repository.js';
import { createApp } from '../../src/http/app.js';
import { InMemoryReviewRepository } from '../../src/infrastructure/repositories/in-memory-review.repository.js';
import { alwaysUser } from '../support/session.js';

const NOW = new Date('2026-03-01T09:00:00.000Z');

const ITEMS: readonly LearningItemView[] = [
  { id: 'item-a', type: 'flashcard', front: 'Recto A', back: 'Verso A' },
  { id: 'item-b', type: 'cloze', front: 'Recto {{c1::B}}', back: 'B' },
];

/**
 * L'application HTTP est testee sans D1 ni Worker : elle ne depend que du port
 * de persistance. C'est le benefice concret de l'inversion de dependance.
 */
let repository: InMemoryReviewRepository;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  repository = new InMemoryReviewRepository(ITEMS);
  app = createApp({
    repository,
    scheduler: new Scheduler(),
    sessionVerifier: alwaysUser('demo'),
    clock: () => NOW,
  });
});

describe('GET /reviews/queue', () => {
  it('renvoie la file de l\'apprenant', async () => {
    const response = await app.request('/reviews/queue?userId=demo');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      now: NOW.toISOString(),
      count: 2,
    });
  });

  it('respecte la limite', async () => {
    const response = await app.request('/reviews/queue?userId=demo&limit=1');
    const body = (await response.json()) as { count: number };

    expect(body.count).toBe(1);
  });

  it('rejette une limite hors bornes', async () => {
    const response = await app.request('/reviews/queue?userId=demo&limit=0');

    expect(response.status).toBe(400);
  });
});

describe('GET /reviews/preview', () => {
  it('renvoie les 4 issues, a intervalles croissants', async () => {
    const response = await app.request('/reviews/preview?userId=demo&itemId=item-a');

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      outcomes: { grade: string; intervalMs: number }[];
    };

    expect(body.outcomes.map((outcome) => outcome.grade)).toEqual([
      'Again',
      'Hard',
      'Good',
      'Easy',
    ]);

    const intervals = body.outcomes.map((outcome) => outcome.intervalMs);
    expect(intervals).toEqual([...intervals].sort((a, b) => a - b));
  });

  it('n\'enregistre rien : c\'est une projection', async () => {
    await app.request('/reviews/preview?userId=demo&itemId=item-a');

    expect(repository.logs).toHaveLength(0);
    expect(repository.stateOf('demo', 'item-a')).toBeNull();
  });

  it('renvoie 404 sur un item inconnu', async () => {
    const response = await app.request('/reviews/preview?userId=demo&itemId=inconnu');

    expect(response.status).toBe(404);
  });

  it('rejette une requete incomplete', async () => {
    expect((await app.request('/reviews/preview?userId=demo')).status).toBe(400);
  });
});

describe('CORS', () => {
  it('autorise le front de developpement', async () => {
    const response = await app.request('/reviews/queue?userId=demo', {
      headers: { origin: 'http://localhost:3000' },
    });

    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
  });

  it('repond au preflight d\'une revision', async () => {
    const response = await app.request('/reviews', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
  });
});

describe('POST /reviews', () => {
  const post = async (body: unknown): Promise<Response> =>
    app.request('/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('enregistre une revision et renvoie la replanification', async () => {
    const response = await post({ userId: 'demo', itemId: 'item-a', grade: 'Good' });

    expect(response.status).toBe(201);

    const body = (await response.json()) as { review: { intervalMs: number } };
    expect(body.review.intervalMs).toBeGreaterThan(0);
    expect(repository.logs).toHaveLength(1);
  });

  it('honore la date de revision fournie', async () => {
    const reviewedAt = '2026-03-02T10:00:00.000Z';
    const response = await post({ userId: 'demo', itemId: 'item-a', grade: 'Good', reviewedAt });

    const body = (await response.json()) as { review: { reviewedAt: string } };
    expect(body.review.reviewedAt).toBe(reviewedAt);
  });

  it('renvoie 404 sur un item inconnu', async () => {
    const response = await post({ userId: 'demo', itemId: 'inconnu', grade: 'Good' });

    expect(response.status).toBe(404);
    expect(repository.logs).toHaveLength(0);
  });

  it.each([
    ['note invalide', { userId: 'demo', itemId: 'item-a', grade: 'Parfait' }],
    ['item manquant', { userId: 'demo', grade: 'Good' }],
    ['date invalide', { userId: 'demo', itemId: 'item-a', grade: 'Good', reviewedAt: 'hier' }],
  ])('renvoie 400 : %s', async (_label, body) => {
    expect((await post(body)).status).toBe(400);
    expect(repository.logs).toHaveLength(0);
  });

  it('renvoie 400 sur un corps JSON illisible', async () => {
    const response = await app.request('/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'ceci n\'est pas du JSON',
    });

    expect(response.status).toBe(400);
  });
});
