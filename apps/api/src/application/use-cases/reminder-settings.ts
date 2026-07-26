import { defaultReminderPreference, type ReminderPreference } from '@bayt/domain';

import type {
  ReminderRepository,
  ReminderSettings,
} from '../ports/reminder-repository.js';

/** Lit la préférence de rappel d'un apprenant (défaut désactivé si aucune). */
export class GetReminderSettings {
  public constructor(private readonly reminders: ReminderRepository) {}

  public async execute(userId: string, timezone: string): Promise<ReminderPreference> {
    const existing = await this.reminders.get(userId);

    return existing ?? defaultReminderPreference(timezone);
  }
}

/** Enregistre la préférence de rappel (heure bornée 0–23). */
export class SaveReminderSettings {
  public constructor(private readonly reminders: ReminderRepository) {}

  public execute(userId: string, settings: ReminderSettings): Promise<ReminderPreference> {
    const hour = Math.min(23, Math.max(0, Math.trunc(settings.hour)));

    return this.reminders.save(userId, { ...settings, hour });
  }
}
