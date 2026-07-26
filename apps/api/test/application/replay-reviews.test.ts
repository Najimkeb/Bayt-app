import { Scheduler } from '@bayt/domain';
import { describe, expect, it } from 'vitest';

import { ReplayReviews, type OfflineReview } from '../../src/application/use-cases/replay-reviews.js';
import { SubmitReview } from '../../src/application/use-cases/submit-review.js';
import {
  InMemoryReviewRepository,
  type SeedItem,
} from '../../src/infrastructure/repositories/in-memory-review.repository.js';

const T1 = new Date('2026-03-15T09:00:00Z');
const T2 = new Date('2026-03-15T10:00:00Z');
const T3 = new Date('2026-03-15T11:00:00Z');

const ITEMS: SeedItem[] = [
  { id: 'c1', type: 'flashcard', front: 'Q1', back: 'R1', domainId: 'd' },
  { id: 'c2', type: 'flashcard', front: 'Q2', back: 'R2', domainId: 'd' },
];

function setup() {
  const repo = new InMemoryReviewRepository(ITEMS);
  const scheduler = new Scheduler();

  return { repo, scheduler, replay: new ReplayReviews(repo, scheduler) };
}

const review = (clientId: string, itemId: string, reviewedAt: Date): OfflineReview => ({
  clientId,
  itemId,
  grade: 'Good',
  reviewedAt,
});

describe('ReplayReviews', () => {
  it('applique chaque révision hors-ligne une fois et met à jour l’état', async () => {
    const { repo, replay } = setup();

    const result = await replay.execute('u1', [review('a', 'c1', T1), review('b', 'c2', T2)]);

    expect(result.settledClientIds).toEqual(['a', 'b']);
    expect(repo.logs).toHaveLength(2);
    expect((await repo.findCard('u1', 'c1'))?.state).not.toBeNull();
    expect((await repo.findCard('u1', 'c2'))?.state).not.toBeNull();
  });

  it('est IDEMPOTENT : renvoyer deux fois la même file ne double pas les logs', async () => {
    const { repo, replay } = setup();
    const batch = [review('a', 'c1', T1), review('b', 'c1', T2)];

    const first = await replay.execute('u1', batch);
    const second = await replay.execute('u1', batch);

    expect(first.settledClientIds).toEqual(['a', 'b']);
    expect(second.settledClientIds).toEqual(['a', 'b']); // confirmés, mais rien de neuf
    expect(repo.logs).toHaveLength(2); // pas 4 : aucun doublon
  });

  it('rejoue dans l’ordre chronologique (tri défensif)', async () => {
    const { repo, replay } = setup();

    // Fournis dans le désordre : t3 puis t1 puis t2.
    await replay.execute('u1', [
      review('c', 'c1', T3),
      review('a', 'c1', T1),
      review('b', 'c1', T2),
    ]);

    const reviewedAts = repo.logs.map((l) => l.reviewedAt.getTime());
    expect(reviewedAts).toEqual([T1.getTime(), T2.getTime(), T3.getTime()]);
  });

  it('conflit multi-appareils : ne régresse PAS un état plus récent (le dernier l’emporte)', async () => {
    const { repo, scheduler, replay } = setup();
    const submit = new SubmitReview(repo, scheduler);

    // Un autre appareil a déjà révisé c1 à T3 (état courant = T3).
    await submit.execute('u1', 'c1', 'Good', T3);
    const stateAfterT3 = (await repo.findCard('u1', 'c1'))?.state;
    const logsBefore = repo.logs.length;

    // Une révision hors-ligne PLUS ANCIENNE (T1) arrive.
    const result = await replay.execute('u1', [review('old', 'c1', T1)]);

    expect(result.settledClientIds).toEqual(['old']); // confirmée (jamais perdue)
    expect(repo.logs).toHaveLength(logsBefore + 1); // le log est bien conservé
    // Mais l'état n'a PAS régressé : il reste celui de T3.
    expect((await repo.findCard('u1', 'c1'))?.state?.lastReviewedAt?.getTime()).toBe(T3.getTime());
    expect((await repo.findCard('u1', 'c1'))?.state).toEqual(stateAfterT3);
  });

  it('item disparu : confirme quand même l’id (le client purge sa file)', async () => {
    const { replay } = setup();

    const result = await replay.execute('u1', [review('z', 'inconnu', T1)]);

    expect(result.settledClientIds).toEqual(['z']);
  });
});
