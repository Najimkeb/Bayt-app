import type { Exercise, Lesson } from '@bayt/domain';

/**
 * Port de persistance des leçons.
 *
 * Rend une `Lesson` **complète** (solutions comprises) : c'est la couche
 * application qui décide de ne jamais exposer les solutions au client. Ce port
 * se teste avec une implémentation en mémoire, sans D1.
 */
export interface LessonRepository {
  /** Une leçon et sa séquence d'exercices, ou `null` si inconnue. */
  findLesson(lessonId: string): Promise<Lesson | null>;

  /** Un exercice précis d'une leçon, ou `null` s'il n'en fait pas partie. */
  findExercise(lessonId: string, exerciseId: string): Promise<Exercise | null>;
}
