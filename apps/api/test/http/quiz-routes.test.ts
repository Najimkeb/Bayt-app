import { Scheduler } from '@bayt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/http/app.js';
import {
  InMemoryReviewRepository,
  type SeedItem,
} from '../../src/infrastructure/repositories/in-memory-review.repository.js';
import { authAs, bearerVerifier } from '../support/session.js';

const ITEMS: SeedItem[] = Array.from({ length: 12 }, (_v, i) => ({
  id: `c${String(i)}`,
  type: 'flashcard',
  front: `Question ${String(i)} ?`,
  back: `Réponse ${String(i)}`,
  domainId: i < 8 ? 'dom_a' : 'dom_b',
}));

let repo: InMemoryReviewRepository;

function build() {
  repo = new InMemoryReviewRepository(ITEMS);

  return createApp({
    repository: repo,
    scheduler: new Scheduler(),
    sessionVerifier: bearerVerifier(),
  });
}

let app: ReturnType<typeof build>;
beforeEach(() => {
  app = build();
});

describe('GET /quiz', () => {
  it('génère un quiz à partir des cartes du domaine', async () => {
    const res = await app.request('/quiz?domainId=dom_a&count=5&types=fill_blank', {
      headers: authAs('u1'),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { questions: { itemId: string; kind: string }[] };
    expect(body.questions).toHaveLength(5);
    // Toutes issues du domaine demandé.
    expect(body.questions.every((q) => q.itemId.startsWith('c'))).toBe(true);
    expect(body.questions.every((q) => q.kind === 'fill_blank')).toBe(true);
  });

  it('n’écrit JAMAIS d’état FSRS (quiz read-only)', async () => {
    await app.request('/quiz?count=10', { headers: authAs('u1') });

    expect(repo.logs).toHaveLength(0);
    expect(repo.stateOf('u1', 'c0')).toBeNull();
  });

  it('borne le nombre de questions aux cartes disponibles du domaine', async () => {
    const res = await app.request('/quiz?domainId=dom_b&count=20', { headers: authAs('u1') });
    const body = (await res.json()) as { questions: unknown[] };
    // dom_b n'a que 4 cartes.
    expect(body.questions).toHaveLength(4);
  });

  it('rejette un count hors bornes (400)', async () => {
    const res = await app.request('/quiz?count=999', { headers: authAs('u1') });
    expect(res.status).toBe(400);
  });
});
