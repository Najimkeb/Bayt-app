import { dailyStatus, initialProgress, type DailyStatus } from '@bayt/domain';

import type { ProgressRepository } from '../ports/progress-repository.js';

/**
 * Cas d'usage « je change mon objectif quotidien ».
 *
 * Modifie **uniquement** la cible d'XP/jour dans la progression existante (pas
 * une nouvelle source de vérité). L'objectif influe sur `goalMet` et la série au
 * prochain gain — jamais sur FSRS. Renvoie la vue du jour à jour.
 */
export class SetDailyGoal {
  public constructor(private readonly repository: ProgressRepository) {}

  public async execute(
    userId: string,
    dailyGoal: number,
    now: Date,
    timeZone: string,
  ): Promise<DailyStatus> {
    const current = (await this.repository.find(userId)) ?? initialProgress();
    const updated = { ...current, dailyGoal };

    await this.repository.save(userId, updated);

    return dailyStatus(updated, now, timeZone);
  }
}
