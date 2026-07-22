/**
 * Contexte borne « Learning Engine » — la boucle de memorisation.
 *
 * Surface publique volontairement etroite : le `Scheduler`, ses types et ses
 * erreurs. L'adaptateur `ts-fsrs` reste interne au paquet.
 */

export type { SchedulingEngine } from './engine.js';
export { SchedulerConfigError } from './errors.js';
export { Scheduler } from './scheduler.js';
export {
  LEARNING_STATES,
  REVIEW_GRADES,
  type LearningState,
  type MemoryState,
  type ResolvedSchedulerConfig,
  type ReviewGrade,
  type ReviewLog,
  type ReviewResult,
  type ScheduledOutcome,
  type SchedulerConfig,
  type SchedulingPreview,
  type SchedulingState,
} from './types.js';
