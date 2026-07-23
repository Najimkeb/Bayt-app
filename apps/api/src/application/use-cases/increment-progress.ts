import { applyXp, dailyStatus, initialProgress, type DailyStatus, type XpEvent } from '@bayt/domain';

import type { ProgressRepository } from '../ports/progress-repository.js';

/** Résultat d'un gain d'XP, avec de quoi célébrer côté UI. */
export interface IncrementResult {
  readonly xpGained: number;
  readonly goalJustReached: boolean;
  readonly streakIncreased: boolean;
  readonly status: DailyStatus;
}

/**
 * Cas d'usage « j'ai gagné de l'XP ».
 *
 * L'XP est calculé par le domaine à partir de l'événement (le client ne dicte
 * pas un montant arbitraire). La série et l'objectif du jour sont mis à jour.
 */
export class IncrementProgress {
  public constructor(private readonly repository: ProgressRepository) {}

  public async execute(
    userId: string,
    event: XpEvent,
    now: Date,
    timeZone: string,
  ): Promise<IncrementResult> {
    const current = (await this.repository.find(userId)) ?? initialProgress();
    const result = applyXp(current, event, now, timeZone);

    await this.repository.save(userId, result.progress);

    return {
      xpGained: result.xpGained,
      goalJustReached: result.goalJustReached,
      streakIncreased: result.streakIncreased,
      status: dailyStatus(result.progress, now, timeZone),
    };
  }
}
