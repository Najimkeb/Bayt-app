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

export interface PathUnit {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly PathLessonNode[];
}

export interface LearningPath {
  readonly units: readonly PathUnit[];
}
