import { domainProgress } from '@bayt/domain';

import type { PathRepository } from '../ports/path-repository.js';
import type { ReviewRepository } from '../ports/review-repository.js';

/** Un domaine du catalogue, avec la progression de l'apprenant. */
export interface DomainOverview {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Nom de l'icône lucide-react (mappé vers un composant côté UI). */
  readonly icon: string;
  readonly color: string;
  readonly order: number;
  readonly lessonsCompleted: number;
  readonly lessonsTotal: number;
  readonly cardsDue: number;
  /** Cartes de ce domaine au TOTAL (dues ou non) — sert à l'état « à remplir ». */
  readonly cardsTotal: number;
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
    const [domains, lessonsByDomain, completed, dueCounts, cardCounts] = await Promise.all([
      this.path.findDomains(),
      this.path.lessonIdsByDomain(),
      this.path.findCompletedLessonIds(userId),
      this.review.dueCountsByDomain(userId, now),
      this.review.cardCountsByDomain(),
    ]);

    const completedSet = new Set(completed);

    return domains.map((domain) => {
      const progress = domainProgress(lessonsByDomain.get(domain.id) ?? [], completedSet);

      return {
        id: domain.id,
        name: domain.name,
        description: domain.description,
        icon: domain.icon,
        color: domain.color,
        order: domain.position,
        lessonsCompleted: progress.completed,
        lessonsTotal: progress.total,
        cardsDue: dueCounts.get(domain.id) ?? 0,
        cardsTotal: cardCounts.get(domain.id) ?? 0,
      };
    });
  }
}
