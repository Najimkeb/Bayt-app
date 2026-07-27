import { and, asc, eq, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
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
  public async findDue(
    userId: string,
    now: Date,
    limit: number,
    domainId?: string,
  ): Promise<readonly ReviewCard[]> {
    const due = or(isNull(schedulingState.itemId), lte(schedulingState.due, now.getTime()));
    const where =
      domainId === undefined ? due : and(due, eq(learningItems.domainId, domainId));

    const rows = await this.db
      .select({ item: learningItems, state: schedulingState })
      .from(learningItems)
      .leftJoin(
        schedulingState,
        and(eq(schedulingState.itemId, learningItems.id), eq(schedulingState.userId, userId)),
      )
      .where(where)
      // Les cartes neuves (`due` NULL) d'abord, puis par echeance croissante.
      .orderBy(asc(sql`coalesce(${schedulingState.due}, -1)`), asc(learningItems.id))
      .limit(limit);

    return rows.map(toReviewCard);
  }

  public async dueCountsByDomain(
    userId: string,
    now: Date,
  ): Promise<ReadonlyMap<string, number>> {
    const rows = await this.db
      .select({ domainId: learningItems.domainId, count: sql<number>`count(*)` })
      .from(learningItems)
      .leftJoin(
        schedulingState,
        and(eq(schedulingState.itemId, learningItems.id), eq(schedulingState.userId, userId)),
      )
      .where(
        and(
          isNotNull(learningItems.domainId),
          or(isNull(schedulingState.itemId), lte(schedulingState.due, now.getTime())),
        ),
      )
      .groupBy(learningItems.domainId);

    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.domainId !== null) {
        map.set(row.domainId, Number(row.count));
      }
    }

    return map;
  }

  public async cardCountsByDomain(): Promise<ReadonlyMap<string, number>> {
    const rows = await this.db
      .select({ domainId: learningItems.domainId, count: sql<number>`count(*)` })
      .from(learningItems)
      .where(isNotNull(learningItems.domainId))
      .groupBy(learningItems.domainId);

    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.domainId !== null) {
        map.set(row.domainId, Number(row.count));
      }
    }

    return map;
  }

  public async countDue(userId: string, now: Date): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(learningItems)
      .leftJoin(
        schedulingState,
        and(eq(schedulingState.itemId, learningItems.id), eq(schedulingState.userId, userId)),
      )
      .where(or(isNull(schedulingState.itemId), lte(schedulingState.due, now.getTime())));

    return Number(rows[0]?.count ?? 0);
  }

  public async itemsForQuiz(
    domainId: string | undefined,
    limit: number,
  ): Promise<readonly { id: string; front: string; back: string }[]> {
    const query = this.db
      .select({ id: learningItems.id, front: learningItems.front, back: learningItems.back })
      .from(learningItems);
    const rows = await (domainId === undefined
      ? query
      : query.where(eq(learningItems.domainId, domainId))
    )
      // Échantillon aléatoire côté SQLite.
      .orderBy(sql`random()`)
      .limit(limit);

    return rows;
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
  public async commitReview({
    userId,
    itemId,
    state,
    log,
    clientId = null,
    advanceState = true,
  }: ReviewCommit): Promise<void> {
    const logInsert = this.db
      .insert(reviewLogs)
      .values(toReviewLogRow(this.newId(), userId, itemId, log, clientId));

    // `advanceState === false` : révision hors-ligne plus ancienne qu'un état
    // déjà à jour (conflit multi-appareils) → on journalise SANS régresser
    // l'état FSRS courant (le plus récent l'emporte). Sinon : upsert de l'état
    // + log, atomiquement (les deux ne divergent jamais).
    if (!advanceState) {
      await logInsert;

      return;
    }

    const row = toSchedulingStateRow(userId, itemId, state, log.reviewedAt);
    await this.db.batch([
      this.db
        .insert(schedulingState)
        .values(row)
        .onConflictDoUpdate({
          target: [schedulingState.userId, schedulingState.itemId],
          set: row,
        }),
      logInsert,
    ]);
  }

  public async findAppliedClientIds(
    userId: string,
    clientIds: readonly string[],
  ): Promise<ReadonlySet<string>> {
    if (clientIds.length === 0) {
      return new Set();
    }

    const rows = await this.db
      .select({ clientId: reviewLogs.clientId })
      .from(reviewLogs)
      .where(and(eq(reviewLogs.userId, userId), inArray(reviewLogs.clientId, [...clientIds])));

    return new Set(rows.map((r) => r.clientId).filter((id): id is string => id !== null));
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
      domainId: row.item.domainId,
    },
    state: row.state === null ? null : toSchedulingState(row.state),
  };
}
