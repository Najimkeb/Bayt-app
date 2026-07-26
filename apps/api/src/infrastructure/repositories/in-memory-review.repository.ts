import type { ReviewLog, SchedulingState } from '@bayt/domain';

import type {
  LearningItemView,
  ReviewCard,
  ReviewCommit,
  ReviewRepository,
} from '../../application/ports/review-repository.js';

/** Cle de composition (apprenant, item). */
function key(userId: string, itemId: string): string {
  return `${userId}::${itemId}`;
}

/**
 * Implementation en memoire du port de persistance.
 *
 * Sert de reference executable du contrat : les cas d'usage sont testes contre
 * elle, sans D1, sans Worker et sans I/O. Elle reproduit fidelement les regles
 * observables du repository D1 (tri par echeance, cartes neuves en tete,
 * journal append-only).
 */
/** Un item de test, éventuellement rattaché à un domaine. */
export type SeedItem = LearningItemView & { readonly domainId?: string | null };

export class InMemoryReviewRepository implements ReviewRepository {
  readonly #items = new Map<string, LearningItemView>();
  readonly #domainOf = new Map<string, string | null>();
  readonly #states = new Map<string, SchedulingState>();
  readonly #logs: ReviewLog[] = [];
  /** Ids clients déjà appliqués (idempotence du rejeu hors-ligne). */
  readonly #clientIds = new Set<string>();

  public constructor(items: readonly SeedItem[] = []) {
    for (const item of items) {
      this.#items.set(item.id, { id: item.id, type: item.type, front: item.front, back: item.back });
      this.#domainOf.set(item.id, item.domainId ?? null);
    }
  }

  /** Journal des revisions, du plus ancien au plus recent (lecture seule). */
  public get logs(): readonly ReviewLog[] {
    return this.#logs;
  }

  /** Etat de planification courant, pour les assertions de test. */
  public stateOf(userId: string, itemId: string): SchedulingState | null {
    return this.#states.get(key(userId, itemId)) ?? null;
  }

  /** Pre-charge un etat, pour construire une situation de test. */
  public seedState(userId: string, itemId: string, state: SchedulingState): void {
    this.#states.set(key(userId, itemId), state);
  }

  public findDue(
    userId: string,
    now: Date,
    limit: number,
    domainId?: string,
  ): Promise<readonly ReviewCard[]> {
    const due = [...this.#items.values()]
      .filter((item) => domainId === undefined || this.#domainOf.get(item.id) === domainId)
      .map((item): ReviewCard => ({ item, state: this.stateOf(userId, item.id) }))
      // Carte neuve (jamais planifiee) => due immediatement.
      .filter(({ state }) => state === null || state.due.getTime() <= now.getTime())
      .sort((a, b) => dueTime(a) - dueTime(b))
      .slice(0, limit);

    return Promise.resolve(due);
  }

  public dueCountsByDomain(userId: string, now: Date): Promise<ReadonlyMap<string, number>> {
    const counts = new Map<string, number>();
    for (const item of this.#items.values()) {
      const domainId = this.#domainOf.get(item.id) ?? null;
      if (domainId === null) {
        continue;
      }
      const state = this.stateOf(userId, item.id);
      if (state === null || state.due.getTime() <= now.getTime()) {
        counts.set(domainId, (counts.get(domainId) ?? 0) + 1);
      }
    }

    return Promise.resolve(counts);
  }

  public findCard(userId: string, itemId: string): Promise<ReviewCard | null> {
    const item = this.#items.get(itemId);

    if (item === undefined) {
      return Promise.resolve(null);
    }

    return Promise.resolve({ item, state: this.stateOf(userId, itemId) });
  }

  public commitReview({
    userId,
    itemId,
    state,
    log,
    clientId = null,
    advanceState = true,
  }: ReviewCommit): Promise<void> {
    if (advanceState) {
      this.#states.set(key(userId, itemId), state);
    }
    this.#logs.push(log);
    if (clientId !== null) {
      this.#clientIds.add(`${userId}:${clientId}`);
    }

    return Promise.resolve();
  }

  public findAppliedClientIds(
    userId: string,
    clientIds: readonly string[],
  ): Promise<ReadonlySet<string>> {
    return Promise.resolve(
      new Set(clientIds.filter((id) => this.#clientIds.has(`${userId}:${id}`))),
    );
  }
}

/** Les cartes neuves passent avant toutes les autres. */
function dueTime(card: ReviewCard): number {
  return card.state === null ? Number.NEGATIVE_INFINITY : card.state.due.getTime();
}
