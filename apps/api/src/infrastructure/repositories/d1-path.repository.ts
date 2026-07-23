import { asc, eq, isNotNull } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  PathRepository,
  PathUnitRow,
} from '../../application/ports/path-repository.js';
import { lessonProgress, lessons, units } from '../db/schema.js';

/** Implémentation D1 (via Drizzle) du chemin de progression. */
export class D1PathRepository implements PathRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async findUnits(): Promise<readonly PathUnitRow[]> {
    const unitRows = await this.db.select().from(units).orderBy(asc(units.position));

    const lessonRows = await this.db
      .select({ id: lessons.id, title: lessons.title, unitId: lessons.unitId })
      .from(lessons)
      .where(isNotNull(lessons.unitId))
      .orderBy(asc(lessons.position), asc(lessons.id));

    return unitRows.map((unit) => ({
      id: unit.id,
      title: unit.title,
      color: unit.color,
      lessons: lessonRows
        .filter((lesson) => lesson.unitId === unit.id)
        .map((lesson) => ({ id: lesson.id, title: lesson.title })),
    }));
  }

  public async findCompletedLessonIds(userId: string): Promise<readonly string[]> {
    const rows = await this.db
      .select({ lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, userId));

    return rows.map((row) => row.lessonId);
  }

  public async markLessonCompleted(
    userId: string,
    lessonId: string,
    completedAt: Date,
  ): Promise<void> {
    await this.db
      .insert(lessonProgress)
      .values({ userId, lessonId, completedAt: completedAt.getTime() })
      // Idempotent : on conserve la première réussite.
      .onConflictDoNothing({ target: [lessonProgress.userId, lessonProgress.lessonId] });
  }
}
