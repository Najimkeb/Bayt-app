import { desc, eq, max } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  AdminUserRepository,
  AdminUserRow,
} from '../../application/ports/admin-user-repository.js';
import { session, user } from '../db/schema.js';

/** Implémentation D1 (via Drizzle) de l'administration des comptes. */
export class D1AdminUserRepository implements AdminUserRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async listUsers(): Promise<readonly AdminUserRow[]> {
    // Dernière activité = session la plus récente (LEFT JOIN : aussi les comptes
    // sans session ouverte). Une ligne par utilisateur.
    const rows = await this.db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        lastActiveAt: max(session.updatedAt),
      })
      .from(user)
      .leftJoin(session, eq(session.userId, user.id))
      .groupBy(user.id)
      .orderBy(desc(user.createdAt));

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      createdAt: row.createdAt.getTime(),
      // `max(updated_at)` est un timestamp Drizzle (Date) ou null.
      lastActiveAt: row.lastActiveAt === null ? null : row.lastActiveAt.getTime(),
    }));
  }

  public async deleteSessions(userId: string): Promise<void> {
    await this.db.delete(session).where(eq(session.userId, userId));
  }
}
