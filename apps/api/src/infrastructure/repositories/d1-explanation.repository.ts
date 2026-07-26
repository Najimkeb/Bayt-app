import type { ReviewGrade } from '@bayt/domain';
import { and, desc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  ExplanationLogRecord,
  ExplanationRepository,
} from '../../application/ports/explanation-repository.js';
import { explanationLogs } from '../db/schema.js';

/** Implémentation D1 (via Drizzle) de l'historique des explications. */
export class D1ExplanationRepository implements ExplanationRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async save(record: ExplanationLogRecord): Promise<void> {
    await this.db.insert(explanationLogs).values(record);
  }

  public async listForUser(
    userId: string,
    itemId?: string,
  ): Promise<readonly ExplanationLogRecord[]> {
    const where =
      itemId === undefined
        ? eq(explanationLogs.userId, userId)
        : and(eq(explanationLogs.userId, userId), eq(explanationLogs.itemId, itemId));

    const rows = await this.db
      .select()
      .from(explanationLogs)
      .where(where)
      .orderBy(desc(explanationLogs.createdAt))
      .limit(50);

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      itemId: row.itemId,
      topic: row.topic,
      score: row.score,
      verdict: row.verdict,
      grade: row.grade as ReviewGrade | null,
      createdAt: row.createdAt,
    }));
  }
}
