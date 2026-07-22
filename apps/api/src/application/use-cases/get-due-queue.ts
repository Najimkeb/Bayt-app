import type { Scheduler, SchedulingState } from '@bayt/domain';

import type { LearningItemView, ReviewRepository } from '../ports/review-repository.js';

/** Nombre de cartes servies par defaut dans une session de revision. */
export const DEFAULT_QUEUE_LIMIT = 20;

/** Une carte prete a etre revisee, telle que consommee par l'UI. */
export interface DueCard {
  readonly item: LearningItemView;
  readonly state: SchedulingState;
  /** Probabilite de rappel a l'instant de la requete (0 a 1). */
  readonly retrievability: number;
}

/**
 * Cas d'usage « quelles cartes dois-je reviser maintenant ? ».
 *
 * Orchestre uniquement : la regle d'ordonnancement vient du domaine (les
 * echeances calculees par FSRS), la selection vient du repository.
 */
export class GetDueQueue {
  public constructor(
    private readonly repository: ReviewRepository,
    private readonly scheduler: Scheduler,
  ) {}

  public async execute(
    userId: string,
    now: Date,
    limit: number = DEFAULT_QUEUE_LIMIT,
  ): Promise<readonly DueCard[]> {
    const cards = await this.repository.findDue(userId, now, limit);

    return cards.map(({ item, state }) => {
      // Une carte jamais planifiee est due immediatement : on materialise son
      // etat initial a la volee, sans l'ecrire (la premiere revision le fera).
      const resolved = state ?? this.scheduler.newState(now);

      return {
        item,
        state: resolved,
        retrievability: this.scheduler.retrievability(resolved, now),
      };
    });
  }
}
