/**
 * Contrat HTTP de la gamification, vu du navigateur.
 *
 * Miroir de `DailyStatus` / `IncrementResult` de l'API.
 */

import type { ReviewGrade } from './types';

export interface DailyStatus {
  readonly xpToday: number;
  readonly dailyGoal: number;
  readonly goalMet: boolean;
  /** Progression vers l'objectif, de 0 à 1. */
  readonly ratio: number;
  readonly streak: number;
  readonly longestStreak: number;
  readonly xpTotal: number;
}

export type XpEvent =
  | { readonly type: 'review'; readonly grade: ReviewGrade }
  | { readonly type: 'exercise'; readonly correct: boolean };

export interface IncrementResult {
  readonly xpGained: number;
  readonly goalJustReached: boolean;
  readonly streakIncreased: boolean;
  readonly status: DailyStatus;
}
