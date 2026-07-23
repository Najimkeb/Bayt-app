import type { Exercise, Lesson } from '@bayt/domain';
import { and, asc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type { LessonRepository } from '../../application/ports/lesson-repository.js';
import { toExercise } from '../db/exercise-mapper.js';
import { exercises, lessons } from '../db/schema.js';

/** Implémentation D1 (via Drizzle) du port des leçons. */
export class D1LessonRepository implements LessonRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async findLesson(lessonId: string): Promise<Lesson | null> {
    const [lesson] = await this.db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (lesson === undefined) {
      return null;
    }

    const rows = await this.db
      .select()
      .from(exercises)
      .where(eq(exercises.lessonId, lessonId))
      .orderBy(asc(exercises.position));

    return {
      id: lesson.id,
      title: lesson.title,
      exercises: rows.map(toExercise),
    };
  }

  public async findExercise(lessonId: string, exerciseId: string): Promise<Exercise | null> {
    const [row] = await this.db
      .select()
      .from(exercises)
      .where(and(eq(exercises.lessonId, lessonId), eq(exercises.id, exerciseId)))
      .limit(1);

    return row === undefined ? null : toExercise(row);
  }
}
