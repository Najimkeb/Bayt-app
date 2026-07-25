import { and, asc, count, eq, gte, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  DomainMasteryRow,
  MemoryHealthCounts,
  ProfileStatsRepository,
  ReviewEvent,
} from '../../application/ports/profile-stats-repository.js';
import { domains, learningItems, lessonProgress, reviewLogs, schedulingState } from '../db/schema.js';

/** Implémentation D1 (via Drizzle) des agrégats de l'écran Profil. */
export class D1ProfileStatsRepository implements ProfileStatsRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async memoryHealth(userId: string): Promise<MemoryHealthCounts> {
    // Comptes par état FSRS (l'apprenant) + total du catalogue. Les cartes sans
    // ligne d'état sont « nouvelles » : new = total − (learning+review+relearning).
    const [stateRows, [totals]] = await Promise.all([
      this.db
        .select({ state: schedulingState.state, n: count() })
        .from(schedulingState)
        .where(eq(schedulingState.userId, userId))
        .groupBy(schedulingState.state),
      this.db.select({ total: count() }).from(learningItems),
    ]);

    const byState = new Map(stateRows.map((row) => [row.state, row.n]));
    const learning = byState.get('learning') ?? 0;
    const review = byState.get('review') ?? 0;
    const relearning = byState.get('relearning') ?? 0;
    const total = totals?.total ?? 0;
    const newCount = Math.max(0, total - (learning + review + relearning));

    return { newCount, learning, review, relearning, total };
  }

  public async lessonsCompleted(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, userId));

    return row?.n ?? 0;
  }

  public async domainMastery(userId: string): Promise<readonly DomainMasteryRow[]> {
    // Un domaine par ligne : total de ses cartes, et combien sont « ancrées »
    // (état `review`) pour cet apprenant. Seuls les domaines avec du contenu.
    const rows = await this.db
      .select({
        id: domains.id,
        name: domains.name,
        icon: domains.icon,
        color: domains.color,
        position: domains.position,
        total: count(learningItems.id),
        mastered: sql<number>`sum(case when ${schedulingState.state} = 'review' then 1 else 0 end)`,
      })
      .from(domains)
      .innerJoin(learningItems, eq(learningItems.domainId, domains.id))
      .leftJoin(
        schedulingState,
        and(eq(schedulingState.itemId, learningItems.id), eq(schedulingState.userId, userId)),
      )
      .groupBy(domains.id)
      .orderBy(asc(domains.position));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      position: row.position,
      total: row.total,
      // `sum(...)` peut être null si le groupe est vide ; borné à un entier.
      mastered: Number(row.mastered ?? 0),
    }));
  }

  public async reviewEvents(userId: string, sinceMs: number): Promise<readonly ReviewEvent[]> {
    const rows = await this.db
      .select({ reviewedAt: reviewLogs.reviewedAt, grade: reviewLogs.grade })
      .from(reviewLogs)
      .where(and(eq(reviewLogs.userId, userId), gte(reviewLogs.reviewedAt, sinceMs)))
      .orderBy(asc(reviewLogs.reviewedAt));

    return rows.map((row) => ({ reviewedAt: row.reviewedAt, grade: row.grade }));
  }
}
