import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  ReviewCard,
  ReviewCommit,
  ReviewRepository,
} from '../../application/ports/review-repository.js';
import { toReviewLogRow, toSchedulingState, toSchedulingStateRow } from '../db/mappers.js';
import { learningItems, reviewLogs, schedulingState } from '../db/schema.js';

/** Genere l'identifiant d'une trace de revision. */
export type IdGenerator = () => string;

/**
 * Implementation D1 (via Drizzle) du port de persistance.
 *
 * Toute la connaissance SQL de l'application est concentree ici : ni le
 * domaine, ni les cas d'usage, ni les routes ne savent qu'il existe une base.
 */
export class D1ReviewRepository implements ReviewRepository {
  public constructor(
    private readonly db: DrizzleD1Database,
    private readonly newId: IdGenerator = () => crypto.randomUUID(),
  ) {}

  /**
   * File des cartes dues.
   *
   * Jointure a gauche : un item sans ligne de planification n'a jamais ete vu
   * par cet apprenant, il est donc du immediatement et passe en tete.
   * S'appuie sur l'index `(user_id, due)`.
   */
  public async findDue(userId: string, now: Date, limit: number): Promise<readonly ReviewCard[]> {
    const rows = await this.db
      .select({ item: learningItems, state: schedulingState })
      .from(learningItems)
      .leftJoin(
        schedulingState,
        and(eq(schedulingState.itemId, learningItems.id), eq(schedulingState.userId, userId)),
      )
      .where(or(isNull(schedulingState.itemId), lte(schedulingState.due, now.getTime())))
      // Les cartes neuves (`due` NULL) d'abord, puis par echeance croissante.
      .orderBy(asc(sql`coalesce(${schedulingState.due}, -1)`), asc(learningItems.id))
      .limit(limit);

    return rows.map(toReviewCard);
  }

  public async findCard(userId: string, itemId: string): Promise<ReviewCard | null> {
    const rows = await this.db
      .select({ item: learningItems, state: schedulingState })
      .from(learningItems)
      .leftJoin(
        schedulingState,
        and(eq(schedulingState.itemId, learningItems.id), eq(schedulingState.userId, userId)),
      )
      .where(eq(learningItems.id, itemId))
      .limit(1);

    const row = rows[0];

    return row === undefined ? null : toReviewCard(row);
  }

  /**
   * Ecrit le nouvel etat **et** la trace en un seul aller-retour.
   *
   * `batch` est atomique cote D1 : l'etat et le journal ne peuvent pas
   * diverger. Le log est insere sans jamais etre mis a jour (append-only).
   */
  public async commitReview({ userId, itemId, state, log }: ReviewCommit): Promise<void> {
    const row = toSchedulingStateRow(userId, itemId, state, log.reviewedAt);

    await this.db.batch([
      this.db
        .insert(schedulingState)
        .values(row)
        .onConflictDoUpdate({
          target: [schedulingState.userId, schedulingState.itemId],
          set: row,
        }),
      this.db.insert(reviewLogs).values(toReviewLogRow(this.newId(), userId, itemId, log)),
    ]);
  }
}

/** Ligne jointe -> carte du point de vue de la couche application. */
function toReviewCard(row: {
  item: typeof learningItems.$inferSelect;
  state: typeof schedulingState.$inferSelect | null;
}): ReviewCard {
  return {
    item: {
      id: row.item.id,
      type: row.item.type,
      front: row.item.front,
      back: row.item.back,
    },
    state: row.state === null ? null : toSchedulingState(row.state),
  };
}
