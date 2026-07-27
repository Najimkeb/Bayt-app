import { Scheduler, type ReviewGrade } from '@bayt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import { ItemNotFoundError } from '../../src/application/errors.js';
import type { LearningItemView } from '../../src/application/ports/review-repository.js';
import { GetDueQueue } from '../../src/application/use-cases/get-due-queue.js';
import { SubmitReview } from '../../src/application/use-cases/submit-review.js';
import { InMemoryReviewRepository } from '../../src/infrastructure/repositories/in-memory-review.repository.js';

const USER = 'user-1';
const OTHER_USER = 'user-2';
const NOW = new Date('2026-03-01T09:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const ITEMS: readonly LearningItemView[] = [
  { id: 'item-a', type: 'flashcard', front: 'Qu\'est-ce que FSRS ?', back: 'Un algorithme SRS.', domainId: null },
  { id: 'item-b', type: 'flashcard', front: 'Que veut dire D1 ?', back: 'La base SQL de Cloudflare.', domainId: null },
  { id: 'item-c', type: 'cloze', front: 'Cloudflare {{c1::Workers}}', back: 'Workers', domainId: null },
];

const scheduler = new Scheduler();

let repository: InMemoryReviewRepository;
let getDueQueue: GetDueQueue;
let submitReview: SubmitReview;

beforeEach(() => {
  repository = new InMemoryReviewRepository(ITEMS);
  getDueQueue = new GetDueQueue(repository, scheduler);
  submitReview = new SubmitReview(repository, scheduler);
});

/**
 * Place une carte a une echeance donnee.
 *
 * On part d'un etat issu d'une vraie revision (donc coherent : trace memoire
 * renseignee, `lastReviewedAt` present), puis on force l'echeance voulue.
 */
function scheduleAt(itemId: string, due: Date, userId = USER): void {
  const reviewedAt = new Date(due.getTime() - DAY_MS);
  const { state } = scheduler.review(scheduler.newState(reviewedAt), 'Good', reviewedAt);

  repository.seedState(userId, itemId, { ...state, due });
}

describe('GetDueQueue', () => {
  it('renvoie toutes les cartes neuves, dues immediatement', async () => {
    const queue = await getDueQueue.execute(USER, NOW);

    expect(queue.map(({ item }) => item.id)).toEqual(['item-a', 'item-b', 'item-c']);
    expect(queue.every(({ state }) => state.state === 'new')).toBe(true);
  });

  it('trie par echeance croissante', async () => {
    scheduleAt('item-a', new Date(NOW.getTime() - 1 * DAY_MS));
    scheduleAt('item-b', new Date(NOW.getTime() - 3 * DAY_MS));
    scheduleAt('item-c', new Date(NOW.getTime() - 2 * DAY_MS));

    const queue = await getDueQueue.execute(USER, NOW);

    expect(queue.map(({ item }) => item.id)).toEqual(['item-b', 'item-c', 'item-a']);
  });

  it('exclut les cartes dont l\'echeance est dans le futur', async () => {
    scheduleAt('item-a', new Date(NOW.getTime() + 1 * DAY_MS));
    scheduleAt('item-b', new Date(NOW.getTime() - 1 * DAY_MS));
    scheduleAt('item-c', new Date(NOW.getTime() + 10 * DAY_MS));

    const queue = await getDueQueue.execute(USER, NOW);

    expect(queue.map(({ item }) => item.id)).toEqual(['item-b']);
  });

  it('respecte la limite demandee', async () => {
    const queue = await getDueQueue.execute(USER, NOW, 2);

    expect(queue).toHaveLength(2);
  });

  it('expose la probabilite de rappel de chaque carte', async () => {
    const queue = await getDueQueue.execute(USER, NOW);

    expect(queue.every(({ retrievability }) => retrievability >= 0 && retrievability <= 1)).toBe(
      true,
    );
  });

  it('isole les apprenants les uns des autres', async () => {
    scheduleAt('item-a', new Date(NOW.getTime() + 30 * DAY_MS), OTHER_USER);

    const queue = await getDueQueue.execute(USER, NOW);

    // La planification de `user-2` ne doit pas masquer la carte pour `user-1`.
    expect(queue.map(({ item }) => item.id)).toContain('item-a');
  });
});

describe('SubmitReview', () => {
  it('materialise l\'etat d\'une carte neuve et le persiste', async () => {
    expect(repository.stateOf(USER, 'item-a')).toBeNull();

    const { state } = await submitReview.execute(USER, 'item-a', 'Good', NOW);

    expect(repository.stateOf(USER, 'item-a')).toEqual(state);
    expect(state.reps).toBe(1);
    expect(state.lastReviewedAt?.getTime()).toBe(NOW.getTime());
  });

  it('ajoute un log decrivant la transition avant -> apres', async () => {
    const { state, log } = await submitReview.execute(USER, 'item-a', 'Good', NOW);

    expect(repository.logs).toHaveLength(1);
    expect(log.grade).toBe<ReviewGrade>('Good');
    expect(log.reviewedAt.getTime()).toBe(NOW.getTime());
    expect(log.stateBefore.state).toBe('new');
    expect(log.stateAfter).toEqual(state);
  });

  it('n\'ecrase jamais un log : le journal est append-only', async () => {
    await submitReview.execute(USER, 'item-a', 'Good', NOW);
    const first = repository.logs[0];

    await submitReview.execute(USER, 'item-a', 'Again', new Date(NOW.getTime() + 60_000));

    expect(repository.logs).toHaveLength(2);
    expect(repository.logs[0]).toBe(first);
  });

  it('sort la carte de la file : elle revient plus tard', async () => {
    await submitReview.execute(USER, 'item-a', 'Good', NOW);

    const queue = await getDueQueue.execute(USER, NOW);
    expect(queue.map(({ item }) => item.id)).not.toContain('item-a');

    const state = repository.stateOf(USER, 'item-a');
    expect(state?.due.getTime()).toBeGreaterThan(NOW.getTime());

    // Elle reapparait une fois l'echeance atteinte.
    const later = await getDueQueue.execute(USER, new Date(state!.due.getTime() + 1));
    expect(later.map(({ item }) => item.id)).toContain('item-a');
  });

  it('« Easy » repousse la carte plus loin que « Again »', async () => {
    const easy = await submitReview.execute(USER, 'item-a', 'Easy', NOW);
    const again = await submitReview.execute(USER, 'item-b', 'Again', NOW);

    expect(easy.state.due.getTime()).toBeGreaterThan(again.state.due.getTime());
  });

  it('accumule les revisions successives d\'une meme carte', async () => {
    const first = await submitReview.execute(USER, 'item-a', 'Good', NOW);
    const second = await submitReview.execute(
      USER,
      'item-a',
      'Good',
      new Date(first.state.due.getTime()),
    );

    expect(second.state.reps).toBe(2);
    expect(second.log.stateBefore).toEqual(first.state);
    expect(repository.logs).toHaveLength(2);
  });

  it('refuse un item inconnu', async () => {
    await expect(submitReview.execute(USER, 'item-inexistant', 'Good', NOW)).rejects.toThrow(
      ItemNotFoundError,
    );
  });
});
