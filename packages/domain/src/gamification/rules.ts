import {
  DEFAULT_DAILY_GOAL,
  XP_PER_CORRECT_EXERCISE,
  XP_PER_REVIEW,
  type DailyStatus,
  type UserProgress,
  type XpEvent,
  type XpResult,
} from './types.js';

/**
 * Règles de gamification — pures, déterministes, testables.
 *
 * `now` est toujours un paramètre explicite (jamais `Date.now()`), et le jour
 * est calculé dans le fuseau de l'apprenant : la série est ainsi robuste au
 * fuseau horaire.
 */

/** Progression initiale d'un apprenant. */
export function initialProgress(dailyGoal: number = DEFAULT_DAILY_GOAL): UserProgress {
  return {
    xpTotal: 0,
    xpToday: 0,
    day: null,
    streak: 0,
    longestStreak: 0,
    dailyGoal,
    lastGoalDay: null,
  };
}

/** XP accordé par un événement. */
export function xpForEvent(event: XpEvent): number {
  return event.type === 'review'
    ? XP_PER_REVIEW[event.grade]
    : event.correct
      ? XP_PER_CORRECT_EXERCISE
      : 0;
}

/** Date locale `YYYY-MM-DD` dans le fuseau donné (repli sur UTC si invalide). */
export function localDay(now: Date, timeZone: string): string {
  try {
    // `en-CA` produit le format ISO `YYYY-MM-DD`.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  }
}

/** Nombre de jours calendaires de `from` à `to` (chaînes `YYYY-MM-DD`). */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);

  return Math.round((b - a) / 86_400_000);
}

/**
 * Applique un gain d'XP et met à jour l'objectif du jour et la série.
 *
 * Gère le changement de journée (l'XP du jour repart de zéro), la continuation
 * de la série (jour consécutif) et sa rupture (un jour manqué).
 */
export function applyXp(
  progress: UserProgress,
  event: XpEvent,
  now: Date,
  timeZone: string,
): XpResult {
  const today = localDay(now, timeZone);
  const amount = xpForEvent(event);

  // Nouvelle journée : l'XP du jour repart de zéro.
  let xpToday = progress.day === today ? progress.xpToday : 0;

  // Vivacité de la série : si le dernier jour-objectif est plus vieux qu'hier,
  // un jour a été manqué → la série est rompue.
  let streak = progress.streak;
  if (progress.lastGoalDay !== null && daysBetween(progress.lastGoalDay, today) > 1) {
    streak = 0;
  }

  xpToday += amount;
  const xpTotal = progress.xpTotal + amount;
  const goalNow = xpToday >= progress.dailyGoal;

  let lastGoalDay = progress.lastGoalDay;
  let goalJustReached = false;
  let streakIncreased = false;

  // L'objectif est atteint aujourd'hui, et pas déjà compté ce jour.
  if (goalNow && lastGoalDay !== today) {
    goalJustReached = true;
    streakIncreased = true;

    streak =
      lastGoalDay !== null && daysBetween(lastGoalDay, today) === 1
        ? streak + 1 // hier comptait : la série se prolonge
        : 1; // première fois, ou série rompue : nouveau départ

    lastGoalDay = today;
  }

  const longestStreak = Math.max(progress.longestStreak, streak);

  return {
    progress: {
      xpTotal,
      xpToday,
      day: today,
      streak,
      longestStreak,
      dailyGoal: progress.dailyGoal,
      lastGoalDay,
    },
    xpGained: amount,
    goalJustReached,
    streakIncreased,
  };
}

/**
 * Série effective à l'affichage : ajustée à sa vivacité, sans écrire en base.
 *
 * La flamme reste visible tant que l'objectif d'hier a été atteint (série en
 * cours), et retombe à 0 dès qu'un jour a été manqué.
 */
export function currentStreak(progress: UserProgress, now: Date, timeZone: string): number {
  if (progress.lastGoalDay === null) {
    return 0;
  }

  return daysBetween(progress.lastGoalDay, localDay(now, timeZone)) <= 1 ? progress.streak : 0;
}

/** Vue du jour, corrigée du changement de journée — pour l'affichage. */
export function dailyStatus(progress: UserProgress, now: Date, timeZone: string): DailyStatus {
  const today = localDay(now, timeZone);
  const xpToday = progress.day === today ? progress.xpToday : 0;
  const goalMet = xpToday >= progress.dailyGoal;
  const streak = currentStreak(progress, now, timeZone);

  return {
    xpToday,
    dailyGoal: progress.dailyGoal,
    goalMet,
    ratio: progress.dailyGoal === 0 ? 1 : Math.min(1, xpToday / progress.dailyGoal),
    streak,
    longestStreak: progress.longestStreak,
    xpTotal: progress.xpTotal,
  };
}
