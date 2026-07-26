import { describe, expect, it } from 'vitest';

import { defaultReminderPreference, dueForReminder, localHour } from '../../src/reminders/index.js';
import type { ReminderPreference } from '../../src/reminders/index.js';

/** 9h à Paris (UTC+2 en été) = 07:00 UTC. */
const AT_9H_PARIS = new Date('2026-07-26T07:00:00.000Z');

function pref(overrides: Partial<ReminderPreference> = {}): ReminderPreference {
  return { enabled: true, hour: 9, timezone: 'Europe/Paris', lastRemindedDay: null, ...overrides };
}

describe('localHour', () => {
  it('donne l’heure locale dans le fuseau de l’apprenant', () => {
    expect(localHour(AT_9H_PARIS, 'Europe/Paris')).toBe(9);
    expect(localHour(AT_9H_PARIS, 'UTC')).toBe(7);
  });

  it('retombe sur UTC pour un fuseau invalide', () => {
    expect(localHour(AT_9H_PARIS, 'Pas/UnFuseau')).toBe(7);
  });
});

describe('dueForReminder', () => {
  it('rappelle à l’heure préférée si activé et pas encore rappelé aujourd’hui', () => {
    expect(dueForReminder(pref(), AT_9H_PARIS)).toBe(true);
  });

  it('ne rappelle jamais si désactivé', () => {
    expect(dueForReminder(pref({ enabled: false }), AT_9H_PARIS)).toBe(false);
  });

  it('ne rappelle pas en dehors de l’heure préférée', () => {
    expect(dueForReminder(pref({ hour: 10 }), AT_9H_PARIS)).toBe(false);
  });

  it('ne rappelle pas deux fois le même jour local', () => {
    // Déjà rappelé le 26 (jour local Paris) → pas de second rappel.
    expect(dueForReminder(pref({ lastRemindedDay: '2026-07-26' }), AT_9H_PARIS)).toBe(false);
  });

  it('rappelle de nouveau un autre jour', () => {
    expect(dueForReminder(pref({ lastRemindedDay: '2026-07-25' }), AT_9H_PARIS)).toBe(true);
  });
});

describe('defaultReminderPreference', () => {
  it('est désactivée par défaut (jamais de rappel non consenti)', () => {
    const p = defaultReminderPreference('Europe/Paris');
    expect(p.enabled).toBe(false);
    expect(p.hour).toBe(9);
    expect(p.timezone).toBe('Europe/Paris');
  });
});
