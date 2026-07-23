import type { Exercise, Lesson } from '@bayt/domain';

import type { LessonRepository } from '../../application/ports/lesson-repository.js';

/**
 * Implémentation en mémoire du port des leçons.
 *
 * Référence exécutable du contrat, pour tester les cas d'usage sans D1.
 */
export class InMemoryLessonRepository implements LessonRepository {
  readonly #lessons = new Map<string, Lesson>();

  public constructor(lessons: readonly Lesson[] = []) {
    for (const lesson of lessons) {
      this.#lessons.set(lesson.id, lesson);
    }
  }

  public findLesson(lessonId: string): Promise<Lesson | null> {
    return Promise.resolve(this.#lessons.get(lessonId) ?? null);
  }

  public findExercise(lessonId: string, exerciseId: string): Promise<Exercise | null> {
    const lesson = this.#lessons.get(lessonId);
    const exercise = lesson?.exercises.find((candidate) => candidate.id === exerciseId);

    return Promise.resolve(exercise ?? null);
  }
}
