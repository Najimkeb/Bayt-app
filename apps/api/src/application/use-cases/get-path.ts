import { assignNodeStates, type PathUnitView } from '@bayt/domain';

import type { PathRepository } from '../ports/path-repository.js';

/** Chemin de progression d'un domaine : ses unités et l'état de leurs nœuds. */
export interface LearningPath {
  readonly units: readonly PathUnitView[];
}

/** Cas d'usage « donne-moi le chemin de progression d'un domaine ». */
export class GetPath {
  public constructor(private readonly repository: PathRepository) {}

  public async execute(userId: string, domainId: string): Promise<LearningPath> {
    const [units, completed] = await Promise.all([
      this.repository.findUnits(domainId),
      this.repository.findCompletedLessonIds(userId),
    ]);

    // La règle de progression (une seule leçon disponible) vit dans le domaine.
    return { units: assignNodeStates(units, new Set(completed)) };
  }
}
