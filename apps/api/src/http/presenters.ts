import type { SchedulingPreview, SchedulingState } from '@bayt/domain';

import type { DueCard } from '../application/use-cases/get-due-queue.js';
import type { SubmitReviewResult } from '../application/use-cases/submit-review.js';
import type { DueCardDto, PreviewDto, ReviewResultDto, SchedulingStateDto } from './dto.js';

/**
 * Traduction du domaine vers le contrat HTTP.
 *
 * Les dates sortent en ISO 8601 (UTC) : lisible, non ambigu, directement
 * consommable par le client. La representation interne (epoch ms en base,
 * `Date` dans le domaine) reste invisible.
 */

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
export function presentDueCard(card: DueCard): DueCardDto {
  return {
    item: card.item,
    scheduling: presentState(card.state),
    retrievability: card.retrievability,
  };
}

/** Les 4 issues possibles, pour alimenter les boutons de notation. */
export function presentPreview(
  itemId: string,
  now: Date,
  preview: SchedulingPreview,
): PreviewDto {
  return {
    itemId,
    now: now.toISOString(),
    outcomes: preview.map((outcome) => ({
      grade: outcome.grade,
      intervalMs: outcome.intervalMs,
      due: outcome.state.due.toISOString(),
    })),
  };
}

/** Le resultat d'une revision, avec de quoi alimenter le feedback de l'UI. */
export function presentReviewResult(result: SubmitReviewResult): ReviewResultDto {
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
