import type {
  IdentityRepository,
  UserIdentity,
} from '../../application/ports/identity-repository.js';

/** Implémentation en mémoire de la lecture d'identité (tests, sans D1). */
export class InMemoryIdentityRepository implements IdentityRepository {
  readonly #users = new Map<string, UserIdentity>();

  public constructor(users: readonly UserIdentity[] = []) {
    for (const user of users) {
      this.#users.set(user.id, user);
    }
  }

  public findById(userId: string): Promise<UserIdentity | null> {
    return Promise.resolve(this.#users.get(userId) ?? null);
  }
}
