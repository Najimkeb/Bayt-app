/**
 * Contexte « Gamification & Progression » — motivation, séparé du moteur mémoire.
 */

export {
  applyXp,
  currentStreak,
  dailyStatus,
  daysBetween,
  initialProgress,
  localDay,
  xpForEvent,
} from './rules.js';
export {
  DEFAULT_DAILY_GOAL,
  XP_PER_CORRECT_EXERCISE,
  XP_PER_REVIEW,
  type DailyStatus,
  type UserProgress,
  type XpEvent,
  type XpResult,
} from './types.js';
