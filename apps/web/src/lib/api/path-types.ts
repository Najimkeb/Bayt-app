/**
 * Contrat HTTP du chemin de progression, vu du navigateur.
 *
 * Miroir de `LearningPath` de l'API.
 */

export type LessonNodeState = 'completed' | 'available' | 'locked';

export interface PathLessonNode {
  readonly id: string;
  readonly title: string;
  readonly state: LessonNodeState;
}

export type UnitColor = 'green' | 'blue' | 'yellow' | 'purple';

export interface PathUnit {
  readonly id: string;
  readonly title: string;
  readonly color: string;
  readonly lessons: readonly PathLessonNode[];
}

export interface LearningPath {
  readonly units: readonly PathUnit[];
}
