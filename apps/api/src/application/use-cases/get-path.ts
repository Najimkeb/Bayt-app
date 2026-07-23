import type { PathRepository, PathUnitRow } from '../ports/path-repository.js';

/**
 * État d'un nœud du chemin.
 * - `completed` : leçon terminée ;
 * - `available` : la prochaine leçon à jouer (une seule à la fois) ;
 * - `locked` : verrouillée tant que la précédente n'est pas terminée.
 */
export type LessonNodeState = 'completed' | 'available' | 'locked';

export interface PathLessonNode {
  readonly id: string;
  readonly title: string;
  readonly state: LessonNodeState;
}

export interface PathUnit {
  readonly id: string;
  readonly title: string;
  readonly color: string;
  readonly lessons: readonly PathLessonNode[];
}

export interface LearningPath {
  readonly units: readonly PathUnit[];
}

/**
 * Attribue les états des nœuds, dans l'ordre global du chemin.
 *
 * Règle Duolingo : les leçons terminées sont `completed`, la **première** non
 * terminée est `available`, toutes les suivantes sont `locked`. Pure et
 * testable.
 */
export function assignNodeStates(
  units: readonly PathUnitRow[],
  completed: ReadonlySet<string>,
): PathUnit[] {
  let availableAssigned = false;

  return units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    color: unit.color,
    lessons: unit.lessons.map((lesson) => {
      let state: LessonNodeState;

      if (completed.has(lesson.id)) {
        state = 'completed';
      } else if (!availableAssigned) {
        state = 'available';
        availableAssigned = true;
      } else {
        state = 'locked';
      }

      return { id: lesson.id, title: lesson.title, state };
    }),
  }));
}

/** Cas d'usage « donne-moi le chemin de progression de l'apprenant ». */
export class GetPath {
  public constructor(private readonly repository: PathRepository) {}

  public async execute(userId: string): Promise<LearningPath> {
    const [units, completed] = await Promise.all([
      this.repository.findUnits(),
      this.repository.findCompletedLessonIds(userId),
    ]);

    return { units: assignNodeStates(units, new Set(completed)) };
  }
}
