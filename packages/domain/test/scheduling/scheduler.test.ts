import { describe, expect, it } from 'vitest';

import {
  REVIEW_GRADES,
  Scheduler,
  SchedulerConfigError,
  type ReviewGrade,
} from '../../src/index.js';

import { addDays, intervalInDays, reviewedCard, T0 } from './helpers.js';

/** Planificateur par defaut : fuzz desactive => resultats reproductibles. */
const scheduler = new Scheduler();

describe('Scheduler — configuration', () => {
  it('applique les valeurs par defaut du domaine (retention 0.9, sans fuzz)', () => {
    expect(scheduler.config).toEqual({
      requestRetention: 0.9,
      maximumInterval: 36500,
      enableFuzz: false,
    });
  });

  it('accepte une configuration partielle et conserve les defauts pour le reste', () => {
    const custom = new Scheduler({ requestRetention: 0.95, maximumInterval: 365 });

    expect(custom.config).toEqual({
      requestRetention: 0.95,
      maximumInterval: 365,
      enableFuzz: false,
    });
  });

  it.each([
    ['retention nulle', { requestRetention: 0 }],
    ['retention >= 1', { requestRetention: 1 }],
    ['retention hors bornes', { requestRetention: 1.2 }],
    ['intervalle maximum nul', { maximumInterval: 0 }],
    ['intervalle maximum negatif', { maximumInterval: -5 }],
    ['retention NaN', { requestRetention: Number.NaN }],
  ])('refuse une configuration invalide : %s', (_label, config) => {
    expect(() => new Scheduler(config)).toThrow(SchedulerConfigError);
  });
});

describe('Scheduler — carte neuve', () => {
  it('cree une carte due immediatement, sans historique', () => {
    const state = scheduler.newState(T0);

    expect(state.state).toBe('new');
    expect(state.due.getTime()).toBe(T0.getTime());
    expect(state.lastReviewedAt).toBeNull();
    expect(state.reps).toBe(0);
    expect(state.lapses).toBe(0);
    expect(state.memory).toEqual({ stability: 0, difficulty: 0 });
  });

  it('utilise l\'instant courant quand aucune date n\'est fournie', () => {
    const before = Date.now();
    const state = scheduler.newState();
    const after = Date.now();

    expect(state.due.getTime()).toBeGreaterThanOrEqual(before);
    expect(state.due.getTime()).toBeLessThanOrEqual(after);
  });
});

describe('Scheduler — review', () => {
  it('« Again » degrade la memoire par rapport a « Good »', () => {
    const { state, now } = reviewedCard(scheduler);
    const later = addDays(now, 10);

    const again = scheduler.review(state, 'Again', later).state;
    const good = scheduler.review(state, 'Good', later).state;

    expect(again.memory.stability).toBeLessThan(good.memory.stability);
    expect(again.memory.difficulty).toBeGreaterThan(good.memory.difficulty);
    expect(again.due.getTime()).toBeLessThan(good.due.getTime());
  });

  it('« Again » sur une carte en revision compte un oubli et repasse en reapprentissage', () => {
    const { state, now } = reviewedCard(scheduler);
    const later = addDays(now, 10);

    const after = scheduler.review(state, 'Again', later).state;

    expect(after.lapses).toBe(state.lapses + 1);
    expect(after.state).toBe('relearning');
  });

  it('incremente les repetitions et horodate la revision', () => {
    const { state, now } = reviewedCard(scheduler);
    const later = addDays(now, 10);

    const after = scheduler.review(state, 'Good', later).state;

    expect(after.reps).toBe(state.reps + 1);
    expect(after.lastReviewedAt?.getTime()).toBe(later.getTime());
    expect(after.due.getTime()).toBeGreaterThan(later.getTime());
  });

  it('ne mute jamais l\'etat fourni (le domaine est immuable)', () => {
    const { state, now } = reviewedCard(scheduler);
    const snapshot = structuredClone(state);

    scheduler.review(state, 'Again', addDays(now, 3));

    expect(state).toEqual(snapshot);
  });

  it('produit un ReviewLog append-only decrivant la transition avant -> apres', () => {
    const { state, now } = reviewedCard(scheduler);
    const later = addDays(now, 10);

    const { state: after, log } = scheduler.review(state, 'Hard', later);

    expect(log.grade).toBe<ReviewGrade>('Hard');
    expect(log.reviewedAt.getTime()).toBe(later.getTime());
    expect(log.stateBefore).toEqual(state);
    expect(log.stateAfter).toEqual(after);
  });
});

describe('Scheduler — retention cible', () => {
  it('une retention plus haute raccourcit l\'intervalle « Good »', () => {
    const relaxed = new Scheduler({ requestRetention: 0.85 });
    const strict = new Scheduler({ requestRetention: 0.97 });

    // Meme carte de depart pour les deux planificateurs : seule la cible change.
    const { state, now } = reviewedCard(scheduler);
    const later = addDays(now, 10);

    const relaxedDue = relaxed.review(state, 'Good', later).state.due.getTime();
    const strictDue = strict.review(state, 'Good', later).state.due.getTime();

    expect(strictDue).toBeLessThan(relaxedDue);
  });

  it('raccourcit les intervalles quand `maximumInterval` est bas', () => {
    const capped = new Scheduler({ maximumInterval: 30 });
    const { state, now } = reviewedCard(scheduler);
    const later = addDays(now, 10);

    const cappedDays = intervalInDays(capped, state, 'Easy', later);
    const uncappedDays = intervalInDays(scheduler, state, 'Easy', later);

    expect(cappedDays).toBeLessThan(uncappedDays);
    // Le plafond porte sur l'intervalle FSRS ; l'ordre strict des 4 boutons
    // peut ensuite ajouter jusqu'a 3 jours (Hard+1, Good+1, Easy+1).
    expect(cappedDays).toBeLessThanOrEqual(30 + 3);
  });
});

describe('Scheduler — preview', () => {
  it('renvoie les 4 notes dans l\'ordre du domaine', () => {
    const { state, now } = reviewedCard(scheduler);

    const outcomes = scheduler.preview(state, addDays(now, 10));

    expect(outcomes).toHaveLength(4);
    expect(outcomes.map((outcome) => outcome.grade)).toEqual([...REVIEW_GRADES]);
  });

  it('donne des intervalles strictement croissants de « Again » a « Easy »', () => {
    const { state, now } = reviewedCard(scheduler);

    const intervals = scheduler
      .preview(state, addDays(now, 10))
      .map((outcome) => outcome.intervalMs);

    expect(intervals).toEqual([...intervals].sort((a, b) => a - b));
    expect(new Set(intervals).size).toBe(4);
  });

  it('vaut aussi pour une carte neuve (etapes d\'apprentissage court terme)', () => {
    const outcomes = scheduler.preview(scheduler.newState(T0), T0);
    const intervals = outcomes.map((outcome) => outcome.intervalMs);

    expect(intervals.every((interval) => interval > 0)).toBe(true);
    expect(intervals).toEqual([...intervals].sort((a, b) => a - b));
  });

  it('coincide exactement avec `review` pour chaque note', () => {
    const { state, now } = reviewedCard(scheduler);
    const later = addDays(now, 10);

    for (const outcome of scheduler.preview(state, later)) {
      expect(outcome.state).toEqual(scheduler.review(state, outcome.grade, later).state);
      expect(outcome.intervalMs).toBe(outcome.state.due.getTime() - later.getTime());
    }
  });
});

describe('Scheduler — retrievability', () => {
  it('vaut 0 pour une carte jamais revisee', () => {
    expect(scheduler.retrievability(scheduler.newState(T0), T0)).toBe(0);
  });

  it('vaut 0 sans jamais lever, meme sur un etat incoherent', () => {
    // Etat improbable (planifie mais sans revision passee) : le domaine doit
    // repondre, pas propager une erreur du moteur sous-jacent.
    const inconsistent = { ...scheduler.newState(T0), state: 'review' as const };

    expect(scheduler.retrievability(inconsistent, addDays(T0, 5))).toBe(0);
  });

  it('reste elevee juste apres une bonne revision', () => {
    const { state, now } = reviewedCard(scheduler);

    expect(scheduler.retrievability(state, now)).toBeGreaterThan(0.9);
  });

  it('decroit avec le temps ecoule', () => {
    const { state, now } = reviewedCard(scheduler);

    const day1 = scheduler.retrievability(state, addDays(now, 1));
    const day30 = scheduler.retrievability(state, addDays(now, 30));
    const day365 = scheduler.retrievability(state, addDays(now, 365));

    expect(day1).toBeGreaterThan(day30);
    expect(day30).toBeGreaterThan(day365);
    expect(day365).toBeGreaterThanOrEqual(0);
    expect(day1).toBeLessThanOrEqual(1);
  });
});

describe('Scheduler — determinisme (fuzz desactive)', () => {
  it('donne exactement le meme resultat pour les memes entrees', () => {
    const { state, now } = reviewedCard(scheduler);
    const later = addDays(now, 10);

    const first = scheduler.review(state, 'Good', later).state;
    const second = new Scheduler().review(state, 'Good', later).state;

    expect(first).toEqual(second);
  });

  it('reproduit une sequence complete a l\'identique', () => {
    const sequence: readonly ReviewGrade[] = ['Good', 'Hard', 'Again', 'Good', 'Easy'];

    const run = (): unknown => {
      const local = new Scheduler();
      let state = local.newState(T0);
      const dues: number[] = [];

      for (const grade of sequence) {
        state = local.review(state, grade, state.due).state;
        dues.push(state.due.getTime());
      }

      return { state, dues };
    };

    expect(run()).toEqual(run());
  });
});
