import type { ReminderPreference } from '@bayt/domain';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
  OwnedReminderPreference,
  ReminderRepository,
  ReminderSettings,
} from '../../application/ports/reminder-repository.js';
import { reminderPrefs } from '../db/schema.js';

/** Ligne D1 → préférence de domaine (0/1 → booléen). */
function toPreference(row: typeof reminderPrefs.$inferSelect): ReminderPreference {
  return {
    enabled: row.enabled === 1,
    hour: row.hour,
    timezone: row.timezone,
    lastRemindedDay: row.lastRemindedDay,
  };
}

/** Implémentation D1 (via Drizzle) du port de rappels. */
export class D1ReminderRepository implements ReminderRepository {
  public constructor(private readonly db: DrizzleD1Database) {}

  public async get(userId: string): Promise<ReminderPreference | null> {
    const [row] = await this.db
      .select()
      .from(reminderPrefs)
      .where(eq(reminderPrefs.userId, userId))
      .limit(1);

    return row === undefined ? null : toPreference(row);
  }

  public async save(userId: string, settings: ReminderSettings): Promise<ReminderPreference> {
    const enabled = settings.enabled ? 1 : 0;
    // `last_reminded_day` n'est PAS touché : changer d'heure ne rouvre pas un
    // créneau déjà honoré aujourd'hui (garde « au plus un rappel par jour »).
    await this.db
      .insert(reminderPrefs)
      .values({ userId, enabled, hour: settings.hour, timezone: settings.timezone })
      .onConflictDoUpdate({
        target: reminderPrefs.userId,
        set: { enabled, hour: settings.hour, timezone: settings.timezone },
      });

    return (await this.get(userId)) as ReminderPreference;
  }

  public async enabledPreferences(): Promise<readonly OwnedReminderPreference[]> {
    const rows = await this.db.select().from(reminderPrefs).where(eq(reminderPrefs.enabled, 1));

    return rows.map((row) => ({ userId: row.userId, preference: toPreference(row) }));
  }

  public async markReminded(userId: string, day: string): Promise<void> {
    await this.db
      .update(reminderPrefs)
      .set({ lastRemindedDay: day })
      .where(eq(reminderPrefs.userId, userId));
  }
}
