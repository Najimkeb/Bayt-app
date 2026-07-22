import { Scheduler, type ReviewGrade, type SchedulingState } from '../../src/index.js';

/** Instant de reference fixe : le domaine est pur, donc entierement deterministe. */
export const T0 = new Date('2026-01-01T08:00:00.000Z');

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Decale une date de `days` jours (accepte les fractions). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Intervalle, en jours, qu'une note produirait sur un etat donne. */
export function intervalInDays(
  scheduler: Scheduler,
  state: SchedulingState,
  grade: ReviewGrade,
  now: Date,
): number {
  const { due } = scheduler.review(state, grade, now).state;

  return (due.getTime() - now.getTime()) / DAY_MS;
}

/**
 * Amene une carte neuve jusqu'a l'etat `review` en la notant `Good`, en
 * respectant a chaque fois la date d'echeance calculee par le moteur.
 *
 * Sert de point de depart aux tests qui portent sur la planification long
 * terme (les etapes d'apprentissage court terme, elles, sont en minutes fixes).
 */
export function reviewedCard(
  scheduler: Scheduler,
  from: Date = T0,
): { state: SchedulingState; now: Date } {
  let state = scheduler.newState(from);
  let now = from;

  for (let i = 0; i < 10 && state.state !== 'review'; i += 1) {
    now = state.due;
    state = scheduler.review(state, 'Good', now).state;
  }

  if (state.state !== 'review') {
    throw new Error('La carte n\'a pas atteint l\'etat "review" — helper a revoir.');
  }

  return { state, now };
}
