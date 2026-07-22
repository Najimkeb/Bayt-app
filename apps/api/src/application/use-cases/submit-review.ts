import type { ReviewGrade, ReviewLog, Scheduler, SchedulingState } from '@bayt/domain';

import { ItemNotFoundError } from '../errors.js';
import type { LearningItemView, ReviewRepository } from '../ports/review-repository.js';

/** Resultat d'une revision, renvoye a l'UI pour le feedback immediat. */
export interface SubmitReviewResult {
  readonly item: LearningItemView;
  readonly state: SchedulingState;
  readonly log: ReviewLog;
}

/**
 * Cas d'usage « je viens de reviser cette carte ».
 *
 * Sequence : charger l'etat -> demander au domaine le nouvel etat -> persister
 * l'etat et le log **ensemble**. Aucun calcul FSRS ici : le `Scheduler` est la
 * seule autorite sur la planification.
 */
export class SubmitReview {
  public constructor(
    private readonly repository: ReviewRepository,
    private readonly scheduler: Scheduler,
  ) {}

  public async execute(
    userId: string,
    itemId: string,
    grade: ReviewGrade,
    now: Date,
  ): Promise<SubmitReviewResult> {
    const card = await this.repository.findCard(userId, itemId);

    if (card === null) {
      throw new ItemNotFoundError(itemId);
    }

    // Premiere rencontre avec cet item : on materialise l'etat initial.
    const before = card.state ?? this.scheduler.newState(now);
    const { state, log } = this.scheduler.review(before, grade, now);

    await this.repository.commitReview({ userId, itemId, state, log });

    return { item: card.item, state, log };
  }
}
