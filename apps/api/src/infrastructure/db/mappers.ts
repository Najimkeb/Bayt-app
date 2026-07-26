import type { ReviewLog, SchedulingState } from '@bayt/domain';

import type { reviewLogs, schedulingState } from './schema.js';

type SchedulingStateRow = typeof schedulingState.$inferSelect;
type ReviewLogRow = typeof reviewLogs.$inferInsert;

/**
 * Traduction entre les lignes D1 et les types du domaine.
 *
 * Les dates traversent la frontiere sous forme d'epoch ms : c'est la seule
 * representation stockee (cf. `schema.ts`).
 */

/** Ligne `scheduling_state` -> etat du domaine. */
export function toSchedulingState(row: SchedulingStateRow): SchedulingState {
  return {
    memory: { stability: row.stability, difficulty: row.difficulty },
    state: row.state,
    due: new Date(row.due),
    lastReviewedAt: row.lastReviewedAt === null ? null : new Date(row.lastReviewedAt),
    reps: row.reps,
    lapses: row.lapses,
    learningStep: row.learningStep,
  };
}

/** Etat du domaine -> ligne `scheduling_state`. */
export function toSchedulingStateRow(
  userId: string,
  itemId: string,
  state: SchedulingState,
  updatedAt: Date,
): SchedulingStateRow {
  return {
    userId,
    itemId,
    stability: state.memory.stability,
    difficulty: state.memory.difficulty,
    state: state.state,
    due: state.due.getTime(),
    lastReviewedAt: state.lastReviewedAt === null ? null : state.lastReviewedAt.getTime(),
    reps: state.reps,
    lapses: state.lapses,
    learningStep: state.learningStep,
    updatedAt: updatedAt.getTime(),
  };
}

/** Trace du domaine -> ligne `review_logs` (aplatie avant / apres). */
export function toReviewLogRow(
  id: string,
  userId: string,
  itemId: string,
  log: ReviewLog,
  clientId: string | null = null,
): ReviewLogRow {
  const { stateBefore: before, stateAfter: after } = log;

  return {
    id,
    userId,
    itemId,
    grade: log.grade,
    reviewedAt: log.reviewedAt.getTime(),
    clientId,

    beforeState: before.state,
    beforeStability: before.memory.stability,
    beforeDifficulty: before.memory.difficulty,
    beforeDue: before.due.getTime(),
    beforeLastReviewedAt: before.lastReviewedAt?.getTime() ?? null,
    beforeReps: before.reps,
    beforeLapses: before.lapses,
    beforeLearningStep: before.learningStep,

    afterState: after.state,
    afterStability: after.memory.stability,
    afterDifficulty: after.memory.difficulty,
    afterDue: after.due.getTime(),
    afterLastReviewedAt: after.lastReviewedAt?.getTime() ?? null,
    afterReps: after.reps,
    afterLapses: after.lapses,
    afterLearningStep: after.learningStep,
  };
}
