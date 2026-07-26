import type {
  AccessRepository,
  AllowedEmail,
} from '../../application/ports/access-repository.js';

const normalize = (email: string): string => email.trim().toLowerCase();

/** Implémentation en mémoire de la liste blanche (tests, sans D1). */
export class InMemoryAccessRepository implements AccessRepository {
  readonly #entries = new Map<string, AllowedEmail>();

  public constructor(emails: readonly string[] = []) {
    for (const email of emails) {
      this.#entries.set(normalize(email), { email: normalize(email), addedAt: 0, note: null });
    }
  }

  public isAllowed(email: string): Promise<boolean> {
    return Promise.resolve(this.#entries.has(normalize(email)));
  }

  public list(): Promise<readonly AllowedEmail[]> {
    return Promise.resolve([...this.#entries.values()].sort((a, b) => b.addedAt - a.addedAt));
  }

  public add(email: string, note: string | null, now: number): Promise<void> {
    this.#entries.set(normalize(email), { email: normalize(email), addedAt: now, note });

    return Promise.resolve();
  }

  public remove(email: string): Promise<void> {
    this.#entries.delete(normalize(email));

    return Promise.resolve();
  }
}
