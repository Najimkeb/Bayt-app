import { desc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  AccessRepository,
  AllowedEmail,
} from '../../application/ports/access-repository.js';
import { allowedEmails } from '../db/schema.js';

/** Normalise un e-mail (minuscules + espaces retirés) pour une comparaison stable. */
function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/** Implémentation D1 (via Drizzle) de la liste blanche d'inscription. */
export class D1AccessRepository implements AccessRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async isAllowed(email: string): Promise<boolean> {
    const [row] = await this.db
      .select({ email: allowedEmails.email })
      .from(allowedEmails)
      .where(eq(allowedEmails.email, normalize(email)))
      .limit(1);

    return row !== undefined;
  }

  public async list(): Promise<readonly AllowedEmail[]> {
    const rows = await this.db.select().from(allowedEmails).orderBy(desc(allowedEmails.addedAt));

    return rows.map((row) => ({ email: row.email, addedAt: row.addedAt, note: row.note }));
  }

  public async add(email: string, note: string | null, now: number): Promise<void> {
    const value = { email: normalize(email), addedAt: now, note };

    await this.db
      .insert(allowedEmails)
      .values(value)
      .onConflictDoUpdate({ target: allowedEmails.email, set: { note } });
  }

  public async remove(email: string): Promise<void> {
    await this.db.delete(allowedEmails).where(eq(allowedEmails.email, normalize(email)));
  }
}
