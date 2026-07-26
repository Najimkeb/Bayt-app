import type {
  AdminUserRepository,
  AdminUserRow,
} from '../../application/ports/admin-user-repository.js';

/** Implémentation en mémoire de l'administration des comptes (tests, sans D1). */
export class InMemoryAdminUserRepository implements AdminUserRepository {
  /** Ids dont les sessions ont été fermées (pour assertion de test). */
  public readonly revoked = new Set<string>();

  public constructor(private readonly users: readonly AdminUserRow[] = []) {}

  public listUsers(): Promise<readonly AdminUserRow[]> {
    return Promise.resolve([...this.users].sort((a, b) => b.createdAt - a.createdAt));
  }

  public deleteSessions(userId: string): Promise<void> {
    this.revoked.add(userId);

    return Promise.resolve();
  }
}
