import type { SchedulingState } from '@bayt/domain';

import type { DueCard } from '../application/use-cases/get-due-queue.js';
import type { SubmitReviewResult } from '../application/use-cases/submit-review.js';

/**
 * Traduction du domaine vers le contrat HTTP.
 *
 * Les dates sortent en ISO 8601 (UTC) : lisible, non ambigu, directement
 * consommable par le client. La representation interne (epoch ms en base,
 * `Date` dans le domaine) reste invisible.
 */

interface SchedulingStateDto {
  readonly state: SchedulingState['state'];
  readonly stability: number;
  readonly difficulty: number;
  readonly due: string;
  readonly lastReviewedAt: string | null;
  readonly reps: number;
  readonly lapses: number;
}

function presentState(state: SchedulingState): SchedulingStateDto {
  return {
    state: state.state,
    stability: state.memory.stability,
    difficulty: state.memory.difficulty,
    due: state.due.toISOString(),
    lastReviewedAt: state.lastReviewedAt?.toISOString() ?? null,
    reps: state.reps,
    lapses: state.lapses,
  };
}

/** Une carte de la file de revision. */
export function presentDueCard(card: DueCard): unknown {
  return {
    item: card.item,
    scheduling: presentState(card.state),
    retrievability: card.retrievability,
  };
}

/** Le resultat d'une revision, avec de quoi alimenter le feedback de l'UI. */
export function presentReviewResult(result: SubmitReviewResult): unknown {
  return {
    item: result.item,
    scheduling: presentState(result.state),
    review: {
      grade: result.log.grade,
      reviewedAt: result.log.reviewedAt.toISOString(),
      /** Delai avant le prochain passage, en millisecondes. */
      intervalMs: result.state.due.getTime() - result.log.reviewedAt.getTime(),
    },
  };
}
