import type { ReminderPreference } from '@bayt/domain';
import { describe, expect, it } from 'vitest';

import type {
  OwnedReminderPreference,
  ReminderRepository,
  ReminderSettings,
} from '../../src/application/ports/reminder-repository.js';
import {
  GetReminderSettings,
  SaveReminderSettings,
} from '../../src/application/use-cases/reminder-settings.js';

/** Répertoire en mémoire préservant `lastRemindedDay` à la sauvegarde (comme D1). */
class InMemoryReminderRepository implements ReminderRepository {
  readonly #prefs = new Map<string, ReminderPreference>();

  public get(userId: string): Promise<ReminderPreference | null> {
    return Promise.resolve(this.#prefs.get(userId) ?? null);
  }

  public save(userId: string, settings: ReminderSettings): Promise<ReminderPreference> {
    const previous = this.#prefs.get(userId);
    const pref: ReminderPreference = {
      ...settings,
      lastRemindedDay: previous?.lastRemindedDay ?? null,
    };
    this.#prefs.set(userId, pref);

    return Promise.resolve(pref);
  }

  public enabledPreferences(): Promise<readonly OwnedReminderPreference[]> {
    return Promise.resolve([]);
  }

  public markReminded(userId: string, day: string): Promise<void> {
    const pref = this.#prefs.get(userId);
    if (pref !== undefined) {
      this.#prefs.set(userId, { ...pref, lastRemindedDay: day });
    }

    return Promise.resolve();
  }
}

describe('Réglages de rappel', () => {
  it('sauvegarde puis relit les préférences', async () => {
    const repo = new InMemoryReminderRepository();
    await new SaveReminderSettings(repo).execute('u1', {
      enabled: true,
      hour: 8,
      timezone: 'Europe/Paris',
    });

    const pref = await new GetReminderSettings(repo).execute('u1', 'UTC');
    expect(pref).toMatchObject({ enabled: true, hour: 8, timezone: 'Europe/Paris' });
  });

  it('renvoie un défaut désactivé quand aucun réglage n’existe', async () => {
    const pref = await new GetReminderSettings(new InMemoryReminderRepository()).execute(
      'u1',
      'Europe/Paris',
    );

    expect(pref.enabled).toBe(false);
    expect(pref.hour).toBe(9);
    expect(pref.timezone).toBe('Europe/Paris');
  });

  it('borne l’heure dans 0–23', async () => {
    const repo = new InMemoryReminderRepository();
    const save = new SaveReminderSettings(repo);

    await save.execute('high', { enabled: true, hour: 99, timezone: 'UTC' });
    await save.execute('low', { enabled: true, hour: -5, timezone: 'UTC' });

    expect((await repo.get('high'))?.hour).toBe(23);
    expect((await repo.get('low'))?.hour).toBe(0);
  });

  it('ne réinitialise pas le jour de dernier rappel en changeant d’heure', async () => {
    const repo = new InMemoryReminderRepository();
    await new SaveReminderSettings(repo).execute('u1', {
      enabled: true,
      hour: 9,
      timezone: 'UTC',
    });
    await repo.markReminded('u1', '2026-07-26');

    // Changement d'heure → `lastRemindedDay` conservé (garde « un rappel/jour »).
    await new SaveReminderSettings(repo).execute('u1', {
      enabled: true,
      hour: 20,
      timezone: 'UTC',
    });

    expect((await repo.get('u1'))?.lastRemindedDay).toBe('2026-07-26');
  });
});
