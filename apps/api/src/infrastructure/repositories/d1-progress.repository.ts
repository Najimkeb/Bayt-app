import type { UserProgress } from '@bayt/domain';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type { ProgressRepository } from '../../application/ports/progress-repository.js';
import { userProgress } from '../db/schema.js';

/** Implémentation D1 (via Drizzle) du port de progression. */
export class D1ProgressRepository implements ProgressRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async find(userId: string): Promise<UserProgress | null> {
    const [row] = await this.db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId))
      .limit(1);

    if (row === undefined) {
      return null;
    }

    return {
      xpTotal: row.xpTotal,
      xpToday: row.xpToday,
      day: row.day,
      streak: row.streak,
      longestStreak: row.longestStreak,
      dailyGoal: row.dailyGoal,
      lastGoalDay: row.lastGoalDay,
    };
  }

  public async save(userId: string, progress: UserProgress): Promise<void> {
    const row = { userId, ...progress };

    await this.db
      .insert(userProgress)
      .values(row)
      .onConflictDoUpdate({ target: userProgress.userId, set: row });
  }
}
