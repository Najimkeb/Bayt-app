import type { ReviewGrade } from '../scheduling/types.js';

/**
 * Gamification : XP, objectif quotidien, série (streak).
 *
 * C'est une couche de **motivation**, distincte du moteur de mémoire : elle
 * n'influence jamais la planification FSRS. Les règles sont pures et testables ;
 * toutes les dates sont raisonnées dans le fuseau horaire de l'apprenant.
 */

/** Objectif quotidien par défaut, en XP. */
export const DEFAULT_DAILY_GOAL = 50;

/** XP accordé pour un exercice réussi. */
export const XP_PER_CORRECT_EXERCISE = 10;

/** XP accordé par carte révisée, selon la note (réviser = un progrès, toujours). */
export const XP_PER_REVIEW: Readonly<Record<ReviewGrade, number>> = {
  Again: 4,
  Hard: 6,
  Good: 8,
  Easy: 10,
};

/**
 * État de progression d'un apprenant.
 *
 * Les dates sont des chaînes `YYYY-MM-DD` **dans le fuseau de l'apprenant**.
 * `lastGoalDay` est nécessaire pour juger la vivacité de la série sans avoir à
 * écrire en base à la simple lecture.
 */
export interface UserProgress {
  readonly xpTotal: number;
  /** XP accumulé le jour `day`. */
  readonly xpToday: number;
  /** Jour de la dernière activité (fuseau apprenant), ou `null` si jamais actif. */
  readonly day: string | null;
  /** Série courante : jours consécutifs avec objectif atteint. */
  readonly streak: number;
  readonly longestStreak: number;
  readonly dailyGoal: number;
  /** Dernier jour où l'objectif a été atteint, ou `null`. */
  readonly lastGoalDay: string | null;
}

/** Un événement porteur d'XP. */
export type XpEvent =
  | { readonly type: 'review'; readonly grade: ReviewGrade }
  | { readonly type: 'exercise'; readonly correct: boolean };

/** Résultat de l'attribution d'XP : le nouvel état et ce qui vient de se passer. */
export interface XpResult {
  readonly progress: UserProgress;
  readonly xpGained: number;
  /** L'objectif du jour vient d'être atteint à l'instant. */
  readonly goalJustReached: boolean;
  /** La série vient d'augmenter. */
  readonly streakIncreased: boolean;
}

/** Vue du jour, dérivée à la lecture (corrigée du changement de journée). */
export interface DailyStatus {
  readonly xpToday: number;
  readonly dailyGoal: number;
  readonly goalMet: boolean;
  /** Progression vers l'objectif, de 0 à 1. */
  readonly ratio: number;
  /** Série effective, ajustée à sa vivacité (0 si rompue). */
  readonly streak: number;
  readonly longestStreak: number;
  readonly xpTotal: number;
}
