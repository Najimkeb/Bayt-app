import type { ComprehensionVerdict, ReviewGrade } from '@bayt/domain';

import type { ExplanationRepository } from '../ports/explanation-repository.js';

/** Une entrée d'historique, telle que consommée par l'UI. */
export interface ExplanationHistoryEntry {
  readonly topic: string;
  readonly score: number;
  readonly verdict: ComprehensionVerdict;
  readonly grade: ReviewGrade | null;
  readonly itemId: string | null;
  readonly createdAt: number;
}

/** Cas d'usage « mon historique d'explications » (progression sur un concept). */
export class GetExplanationHistory {
  public constructor(private readonly explanations: ExplanationRepository) {}

  public async execute(userId: string, itemId?: string): Promise<readonly ExplanationHistoryEntry[]> {
    const logs = await this.explanations.listForUser(userId, itemId);

    return logs.map((log) => ({
      topic: log.topic,
      score: log.score,
      verdict: log.verdict,
      grade: log.grade,
      itemId: log.itemId,
      createdAt: log.createdAt,
    }));
  }
}
