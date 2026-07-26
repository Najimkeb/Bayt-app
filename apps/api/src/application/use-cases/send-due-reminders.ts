import { dueForReminder, localDay } from '@bayt/domain';

import type { PushPayload, PushSender } from '../ports/push-sender.js';
import type { PushSubscriptionRepository } from '../ports/push-subscription-repository.js';
import type { ReminderRepository } from '../ports/reminder-repository.js';
import type { ReviewRepository } from '../ports/review-repository.js';

/** Bilan d'un passage du CRON de rappels. */
export interface SendRemindersResult {
  /** Apprenants qui ont reçu (au moins) un push cette exécution. */
  readonly remindedUsers: number;
  /** Nombre total de push envoyés (un apprenant peut avoir plusieurs appareils). */
  readonly sent: number;
  /** Abonnements révoqués supprimés (404/410). */
  readonly pruned: number;
}

/** Message du rappel — ton bienveillant façon mascotte, jamais culpabilisant. */
function reminderPayload(due: number, reviewUrl: string): PushPayload {
  const cards = `${String(due)} carte${due > 1 ? 's' : ''}`;

  return {
    title: 'BAYT — c’est le moment d’ancrer',
    body: `Tu as ${cards} à réviser aujourd’hui. Quelques minutes suffisent 🐝`,
    url: reviewUrl,
  };
}

/**
 * Cœur du CRON de rappels (niveau 2).
 *
 * Pour chaque préférence **activée** dont le créneau tombe maintenant (heure
 * locale préférée, pas déjà rappelé aujourd'hui) et qui a des cartes dues :
 * envoie un push à chacun de ses appareils, puis marque le jour local pour
 * garantir **au plus un rappel par jour**. Un abonnement révoqué est supprimé.
 *
 * Toute la décision *quand rappeler* vient du domaine (`dueForReminder`) — ce
 * cas d'usage n'orchestre que la lecture des cartes dues et l'envoi.
 */
export class SendDueReminders {
  public constructor(
    private readonly reminders: ReminderRepository,
    private readonly subscriptions: PushSubscriptionRepository,
    private readonly reviews: ReviewRepository,
    private readonly sender: PushSender,
    private readonly reviewUrl: string,
  ) {}

  public async execute(now: Date): Promise<SendRemindersResult> {
    const enabled = await this.reminders.enabledPreferences();
    let remindedUsers = 0;
    let sent = 0;
    let pruned = 0;

    for (const { userId, preference } of enabled) {
      if (!dueForReminder(preference, now)) {
        continue;
      }

      const due = await this.reviews.countDue(userId, now);
      if (due === 0) {
        continue; // Rien à réviser → on ne dérange pas, et on ne « consomme » pas le jour.
      }

      const subs = await this.subscriptions.findByUser(userId);
      if (subs.length === 0) {
        // Rappels activés mais aucun appareil abonné (niveau 1 seul) : rien à pousser.
        continue;
      }

      const payload = reminderPayload(due, this.reviewUrl);
      let deliveredToUser = false;
      for (const sub of subs) {
        const outcome = await this.sender.send(sub, payload);
        if (outcome.status === 'sent') {
          sent += 1;
          deliveredToUser = true;
        } else if (outcome.status === 'gone') {
          await this.subscriptions.deleteByEndpoint(sub.endpoint);
          pruned += 1;
        }
      }

      // On marque le jour dès qu'un envoi a été tenté avec succès : pas de
      // second passage le même jour. (Si tous les envois ont échoué de façon
      // transitoire, on retentera au prochain tick.)
      if (deliveredToUser) {
        remindedUsers += 1;
        await this.reminders.markReminded(userId, localDay(now, preference.timezone));
      }
    }

    return { remindedUsers, sent, pruned };
  }
}
