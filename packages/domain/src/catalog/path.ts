/**
 * Règles du **chemin de progression** d'un domaine — pures et testables.
 *
 * Un domaine expose ses unités ordonnées ; chaque unité ses leçons ordonnées.
 * L'état des nœuds suit la règle Duolingo : terminé / une seule disponible / le
 * reste verrouillé, dans l'ordre **global** du domaine (à travers les unités).
 */

/**
 * État d'un nœud du chemin.
 * - `completed` : leçon terminée ;
 * - `available` : la prochaine leçon à jouer (une seule à la fois) ;
 * - `locked` : verrouillée tant que la précédente n'est pas terminée.
 */
export type LessonNodeState = 'completed' | 'available' | 'locked';

/** Référence de leçon dans le chemin (identifiant + titre). */
export interface LessonRef {
  readonly id: string;
  readonly title: string;
}

/** Une unité et ses leçons ordonnées, telle que fournie au calcul. */
export interface UnitWithLessons {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly LessonRef[];
}

/** Un nœud du chemin avec son état résolu. */
export interface PathNode {
  readonly id: string;
  readonly title: string;
  readonly state: LessonNodeState;
}

/** Une unité du chemin avec ses nœuds résolus. */
export interface PathUnitView {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly PathNode[];
}

/**
 * Attribue les états des nœuds dans l'ordre global du chemin d'un domaine.
 *
 * Les leçons terminées sont `completed`, la **première** non terminée est
 * `available`, toutes les suivantes sont `locked`. Pure et déterministe.
 */
export function assignNodeStates(
  units: readonly UnitWithLessons[],
  completed: ReadonlySet<string>,
): PathUnitView[] {
  let availableAssigned = false;

  return units.map((unit) => ({
    id: unit.id,
    title: unit.title,
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

/** Progression d'un domaine : leçons terminées / total. */
export interface DomainProgress {
  readonly completed: number;
  readonly total: number;
}

/**
 * Compte les leçons d'un domaine terminées par l'apprenant, sur le total.
 *
 * `total` borne `completed` (une complétion orpheline ne fausse pas le ratio).
 */
export function domainProgress(
  lessonIds: readonly string[],
  completed: ReadonlySet<string>,
): DomainProgress {
  const done = lessonIds.filter((id) => completed.has(id)).length;

  return { completed: done, total: lessonIds.length };
}
