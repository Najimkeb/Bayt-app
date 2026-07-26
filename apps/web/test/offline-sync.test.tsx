import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Le client HTTP est remplacé : on teste la file locale + la synchro. */
const replayReviews = vi.fn<() => Promise<{ settledClientIds: string[] }>>();

vi.mock('@/lib/api/client', () => ({
  replayReviews: () => replayReviews(),
}));

const { enqueuePending, getPending, countPending } = await import('@/lib/offline/db');
const { syncPending } = await import('@/lib/offline/sync');

const review = (clientId: string, reviewedAt: string) => ({
  clientId,
  itemId: 'card1',
  grade: 'Good' as const,
  reviewedAt,
});

async function clearPending(): Promise<void> {
  const pending = await getPending();
  const { removePending } = await import('@/lib/offline/db');
  await removePending(pending.map((p) => p.clientId));
}

beforeEach(async () => {
  vi.clearAllMocks();
  await clearPending();
});

describe('file de révision hors-ligne', () => {
  it('met une révision en file, qui persiste', async () => {
    await enqueuePending(review('a', '2026-03-01T09:00:00.000Z'));

    expect(await countPending()).toBe(1);
    expect((await getPending())[0]?.clientId).toBe('a');
  });

  it('rend la file dans l’ordre chronologique', async () => {
    await enqueuePending(review('late', '2026-03-01T11:00:00.000Z'));
    await enqueuePending(review('early', '2026-03-01T09:00:00.000Z'));

    expect((await getPending()).map((p) => p.clientId)).toEqual(['early', 'late']);
  });

  it('synchronise puis PURGE la file — appliquée une seule fois', async () => {
    await enqueuePending(review('a', '2026-03-01T09:00:00.000Z'));
    await enqueuePending(review('b', '2026-03-01T10:00:00.000Z'));
    replayReviews.mockResolvedValue({ settledClientIds: ['a', 'b'] });

    const outcome = await syncPending();

    expect(outcome).toMatchObject({ synced: 2, remaining: 0, ok: true });
    expect(replayReviews).toHaveBeenCalledTimes(1);
    // File purgée : une 2e synchro n'envoie plus rien (pas de doublon).
    const second = await syncPending();
    expect(second.synced).toBe(0);
    expect(replayReviews).toHaveBeenCalledTimes(1);
    expect(await countPending()).toBe(0);
  });

  it('n’efface RIEN si l’envoi échoue : la file reste intègre pour un nouvel essai', async () => {
    await enqueuePending(review('a', '2026-03-01T09:00:00.000Z'));
    replayReviews.mockRejectedValue(new Error('offline'));

    const outcome = await syncPending();

    expect(outcome.ok).toBe(false);
    expect(await countPending()).toBe(1); // rien perdu
  });

  it('ne purge QUE les ids confirmés par le serveur (idempotence partielle sûre)', async () => {
    await enqueuePending(review('a', '2026-03-01T09:00:00.000Z'));
    await enqueuePending(review('b', '2026-03-01T10:00:00.000Z'));
    // Le serveur ne confirme que 'a' (ex. 'b' en échec transitoire).
    replayReviews.mockResolvedValue({ settledClientIds: ['a'] });

    await syncPending();

    const remaining = await getPending();
    expect(remaining.map((p) => p.clientId)).toEqual(['b']); // 'b' reste à resynchroniser
  });
});
