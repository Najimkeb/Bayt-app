import type { ReminderPreference } from '@bayt/domain';
import { describe, expect, it } from 'vitest';

import type { PushOutcome, PushPayload, PushSender } from '../../src/application/ports/push-sender.js';
import type {
  PushSubscriptionInput,
  PushSubscriptionRecord,
  PushSubscriptionRepository,
} from '../../src/application/ports/push-subscription-repository.js';
import type {
  OwnedReminderPreference,
  ReminderRepository,
  ReminderSettings,
} from '../../src/application/ports/reminder-repository.js';
import type { ReviewRepository } from '../../src/application/ports/review-repository.js';
import { SendDueReminders } from '../../src/application/use-cases/send-due-reminders.js';

/** 9h à Paris (UTC+2 en été) = 07:00 UTC — créneau de tous les tests. */
const AT_9H_PARIS = new Date('2026-07-26T07:00:00.000Z');

class FakeReminderRepository implements ReminderRepository {
  readonly #prefs = new Map<string, ReminderPreference>();

  public seed(userId: string, pref: ReminderPreference): void {
    this.#prefs.set(userId, pref);
  }

  public get(userId: string): Promise<ReminderPreference | null> {
    return Promise.resolve(this.#prefs.get(userId) ?? null);
  }

  public save(userId: string, settings: ReminderSettings): Promise<ReminderPreference> {
    const pref = { ...settings, lastRemindedDay: null };
    this.#prefs.set(userId, pref);

    return Promise.resolve(pref);
  }

  public enabledPreferences(): Promise<readonly OwnedReminderPreference[]> {
    const owned: OwnedReminderPreference[] = [];
    for (const [userId, preference] of this.#prefs) {
      if (preference.enabled) {
        owned.push({ userId, preference });
      }
    }

    return Promise.resolve(owned);
  }

  public markReminded(userId: string, day: string): Promise<void> {
    const pref = this.#prefs.get(userId);
    if (pref !== undefined) {
      this.#prefs.set(userId, { ...pref, lastRemindedDay: day });
    }

    return Promise.resolve();
  }
}

class FakeSubscriptionRepository implements PushSubscriptionRepository {
  readonly #subs = new Map<string, PushSubscriptionRecord>();

  public seed(record: PushSubscriptionRecord): void {
    this.#subs.set(record.endpoint, record);
  }

  public save(userId: string, subscription: PushSubscriptionInput): Promise<void> {
    this.#subs.set(subscription.endpoint, { id: subscription.endpoint, userId, ...subscription });

    return Promise.resolve();
  }

  public deleteByEndpoint(endpoint: string): Promise<void> {
    this.#subs.delete(endpoint);

    return Promise.resolve();
  }

  public findByUser(userId: string): Promise<readonly PushSubscriptionRecord[]> {
    return Promise.resolve([...this.#subs.values()].filter((s) => s.userId === userId));
  }

  public get size(): number {
    return this.#subs.size;
  }
}

/** Envoyeur factice : enregistre les appels, rend une issue programmable. */
class FakeSender implements PushSender {
  public readonly calls: { endpoint: string; payload: PushPayload }[] = [];
  public outcome: PushOutcome = { status: 'sent' };

  public send(sub: PushSubscriptionRecord, payload: PushPayload): Promise<PushOutcome> {
    this.calls.push({ endpoint: sub.endpoint, payload });

    return Promise.resolve(this.outcome);
  }
}

/** Répertoire de révision minimal : seules les cartes dues nous intéressent ici. */
function reviewRepoWithDue(dueByUser: Record<string, number>): ReviewRepository {
  return {
    countDue: (userId: string) => Promise.resolve(dueByUser[userId] ?? 0),
  } as unknown as ReviewRepository;
}

function pref(overrides: Partial<ReminderPreference> = {}): ReminderPreference {
  return { enabled: true, hour: 9, timezone: 'Europe/Paris', lastRemindedDay: null, ...overrides };
}

function sub(userId: string, endpoint: string): PushSubscriptionRecord {
  return { id: endpoint, userId, endpoint, p256dh: 'p', auth: 'a' };
}

function setup(dueByUser: Record<string, number>) {
  const reminders = new FakeReminderRepository();
  const subscriptions = new FakeSubscriptionRepository();
  const sender = new FakeSender();
  const useCase = new SendDueReminders(
    reminders,
    subscriptions,
    reviewRepoWithDue(dueByUser),
    sender,
    'https://bayt.app/review',
  );

  return { reminders, subscriptions, sender, useCase };
}

describe('SendDueReminders', () => {
  it('ne cible que les apprenants activés, à l’heure, avec des cartes dues', async () => {
    const { reminders, subscriptions, sender, useCase } = setup({
      enabledDue: 5,
      disabled: 5,
      wrongHour: 5,
      noCards: 0,
    });
    reminders.seed('enabledDue', pref());
    reminders.seed('disabled', pref({ enabled: false }));
    reminders.seed('wrongHour', pref({ hour: 8 }));
    reminders.seed('noCards', pref());
    for (const u of ['enabledDue', 'disabled', 'wrongHour', 'noCards']) {
      subscriptions.seed(sub(u, `https://push/${u}`));
    }

    const result = await useCase.execute(AT_9H_PARIS);

    // Seul `enabledDue` remplit tous les critères.
    expect(sender.calls.map((c) => c.endpoint)).toEqual(['https://push/enabledDue']);
    expect(result.remindedUsers).toBe(1);
    expect(result.sent).toBe(1);
  });

  it('n’envoie pas deux fois le même jour (au plus un rappel/jour)', async () => {
    const { reminders, subscriptions, sender, useCase } = setup({ u1: 3 });
    reminders.seed('u1', pref());
    subscriptions.seed(sub('u1', 'https://push/u1'));

    await useCase.execute(AT_9H_PARIS);
    // Deuxième passage le même jour (ex. tick suivant) : plus rien n'est envoyé.
    const second = await useCase.execute(AT_9H_PARIS);

    expect(sender.calls).toHaveLength(1);
    expect(second.sent).toBe(0);
    // La préférence porte désormais le jour local du rappel.
    expect((await reminders.get('u1'))?.lastRemindedDay).toBe('2026-07-26');
  });

  it('pousse sur chaque appareil de l’apprenant', async () => {
    const { reminders, subscriptions, sender, useCase } = setup({ u1: 2 });
    reminders.seed('u1', pref());
    subscriptions.seed(sub('u1', 'https://push/phone'));
    subscriptions.seed(sub('u1', 'https://push/laptop'));

    const result = await useCase.execute(AT_9H_PARIS);

    expect(sender.calls).toHaveLength(2);
    expect(result.sent).toBe(2);
  });

  it('supprime un abonnement révoqué (404/410) et ne marque pas le jour', async () => {
    const { reminders, subscriptions, sender, useCase } = setup({ u1: 2 });
    reminders.seed('u1', pref());
    subscriptions.seed(sub('u1', 'https://push/dead'));
    sender.outcome = { status: 'gone' };

    const result = await useCase.execute(AT_9H_PARIS);

    expect(result.pruned).toBe(1);
    expect(result.remindedUsers).toBe(0);
    expect(subscriptions.size).toBe(0);
    // Aucun envoi réussi → le jour n'est pas consommé, on pourra réessayer.
    expect((await reminders.get('u1'))?.lastRemindedDay).toBeNull();
  });

  it('le message reste bienveillant (jamais culpabilisant)', async () => {
    const { reminders, subscriptions, sender, useCase } = setup({ u1: 4 });
    reminders.seed('u1', pref());
    subscriptions.seed(sub('u1', 'https://push/u1'));

    await useCase.execute(AT_9H_PARIS);

    const body = sender.calls[0]?.payload.body ?? '';
    expect(body).toContain('4 cartes');
    expect(body.toLowerCase()).not.toMatch(/abandonn|honte|perdu|raté/);
    expect(sender.calls[0]?.payload.url).toBe('https://bayt.app/review');
  });
});
