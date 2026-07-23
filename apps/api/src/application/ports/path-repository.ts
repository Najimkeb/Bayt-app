/** Une leçon telle que le chemin la référence (id + titre). */
export interface PathLessonRow {
  readonly id: string;
  readonly title: string;
}

/** Une unité et ses leçons, dans l'ordre du chemin. */
export interface PathUnitRow {
  readonly id: string;
  readonly title: string;
  readonly color: string;
  readonly lessons: readonly PathLessonRow[];
}

/**
 * Port de persistance du chemin de progression et de la complétion des leçons.
 */
export interface PathRepository {
  /** Unités ordonnées, chacune avec ses leçons ordonnées. */
  findUnits(): Promise<readonly PathUnitRow[]>;

  /** Identifiants des leçons terminées par l'apprenant. */
  findCompletedLessonIds(userId: string): Promise<readonly string[]>;

  /** Marque une leçon terminée (idempotent : conserve la première réussite). */
  markLessonCompleted(userId: string, lessonId: string, completedAt: Date): Promise<void>;
}
