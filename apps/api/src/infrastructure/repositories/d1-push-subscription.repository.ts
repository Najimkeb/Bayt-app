import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  PushSubscriptionInput,
  PushSubscriptionRecord,
  PushSubscriptionRepository,
} from '../../application/ports/push-subscription-repository.js';
import { pushSubscriptions } from '../db/schema.js';

/** Génère l'identifiant d'un abonnement. */
export type IdGenerator = () => string;

/** Implémentation D1 (via Drizzle) du port d'abonnements Web Push. */
export class D1PushSubscriptionRepository implements PushSubscriptionRepository {
  public constructor(
    private readonly db: DrizzleD1Database,
    private readonly newId: IdGenerator = () => crypto.randomUUID(),
  ) {}

  public async save(userId: string, subscription: PushSubscriptionInput): Promise<void> {
    // `endpoint` est unique : réenregistrer le même navigateur met à jour les
    // clés et le propriétaire plutôt que de créer un doublon.
    await this.db
      .insert(pushSubscriptions)
      .values({
        id: this.newId(),
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        createdAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { userId, p256dh: subscription.p256dh, auth: subscription.auth },
      });
  }

  public async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  public async findByUser(userId: string): Promise<readonly PushSubscriptionRecord[]> {
    const rows = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
    }));
  }
}
