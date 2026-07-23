import type { UserProgress } from '@bayt/domain';

import type { ProgressRepository } from '../../application/ports/progress-repository.js';

/** Implémentation en mémoire du port de progression. */
export class InMemoryProgressRepository implements ProgressRepository {
  readonly #byUser = new Map<string, UserProgress>();

  public find(userId: string): Promise<UserProgress | null> {
    return Promise.resolve(this.#byUser.get(userId) ?? null);
  }

  public save(userId: string, progress: UserProgress): Promise<void> {
    this.#byUser.set(userId, progress);

    return Promise.resolve();
  }
}
