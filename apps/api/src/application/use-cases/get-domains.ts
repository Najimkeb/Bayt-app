import { domainProgress } from '@bayt/domain';

import type { PathRepository } from '../ports/path-repository.js';
import type { ReviewRepository } from '../ports/review-repository.js';

/** Un domaine du catalogue, avec la progression de l'apprenant. */
export interface DomainOverview {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly emoji: string;
  readonly color: string;
  readonly order: number;
  readonly lessonsCompleted: number;
  readonly lessonsTotal: number;
  readonly cardsDue: number;
}

/**
 * Cas d'usage « liste des domaines avec ma progression ».
 *
 * Combine catalogue (leçons par domaine, terminées) et révision (cartes dues par
 * domaine). Le calcul de progression vient du domaine (`domainProgress`).
 */
export class GetDomains {
  public constructor(
    private readonly path: PathRepository,
    private readonly review: ReviewRepository,
  ) {}

  public async execute(userId: string, now: Date): Promise<readonly DomainOverview[]> {
    const [domains, lessonsByDomain, completed, dueCounts] = await Promise.all([
      this.path.findDomains(),
      this.path.lessonIdsByDomain(),
      this.path.findCompletedLessonIds(userId),
      this.review.dueCountsByDomain(userId, now),
    ]);

    const completedSet = new Set(completed);

    return domains.map((domain) => {
      const progress = domainProgress(lessonsByDomain.get(domain.id) ?? [], completedSet);

      return {
        id: domain.id,
        name: domain.name,
        description: domain.description,
        emoji: domain.emoji,
        color: domain.color,
        order: domain.position,
        lessonsCompleted: progress.completed,
        lessonsTotal: progress.total,
        cardsDue: dueCounts.get(domain.id) ?? 0,
      };
    });
  }
}
