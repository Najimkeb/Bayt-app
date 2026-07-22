import type { Scheduler, SchedulingPreview } from '@bayt/domain';

import { ItemNotFoundError } from '../errors.js';
import type { ReviewRepository } from '../ports/review-repository.js';

/**
 * Cas d'usage « que se passe-t-il si je note cette carte X ? ».
 *
 * Alimente les 4 boutons de revision avec l'intervalle reel qui serait
 * applique. Aucune ecriture : c'est une projection, pas une revision. Le calcul
 * reste entierement dans le domaine — le front n'en refait jamais une partie.
 */
export class PreviewReview {
  public constructor(
    private readonly repository: ReviewRepository,
    private readonly scheduler: Scheduler,
  ) {}

  public async execute(userId: string, itemId: string, now: Date): Promise<SchedulingPreview> {
    const card = await this.repository.findCard(userId, itemId);

    if (card === null) {
      throw new ItemNotFoundError(itemId);
    }

    return this.scheduler.preview(card.state ?? this.scheduler.newState(now), now);
  }
}
