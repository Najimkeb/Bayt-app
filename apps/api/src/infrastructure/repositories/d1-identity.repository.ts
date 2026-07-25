import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  IdentityRepository,
  UserIdentity,
} from '../../application/ports/identity-repository.js';
import { user } from '../db/schema.js';

/** Implémentation D1 (via Drizzle) de la lecture d'identité (table Better Auth `user`). */
export class D1IdentityRepository implements IdentityRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async findById(userId: string): Promise<UserIdentity | null> {
    const [row] = await this.db.select().from(user).where(eq(user.id, userId)).limit(1);

    if (row === undefined) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      // `created_at` est un timestamp Drizzle (Date) → epoch ms.
      createdAt: row.createdAt.getTime(),
    };
  }
}
