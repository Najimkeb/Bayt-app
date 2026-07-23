import { dailyStatus, initialProgress, type DailyStatus } from '@bayt/domain';

import type { ProgressRepository } from '../ports/progress-repository.js';

/**
 * Cas d'usage « donne-moi la progression du jour ».
 *
 * Renvoie une vue dérivée (corrigée du changement de journée et de la vivacité
 * de la série) — sans jamais écrire en base à la simple lecture.
 */
export class GetProgress {
  public constructor(private readonly repository: ProgressRepository) {}

  public async execute(userId: string, now: Date, timeZone: string): Promise<DailyStatus> {
    const progress = (await this.repository.find(userId)) ?? initialProgress();

    return dailyStatus(progress, now, timeZone);
  }
}
