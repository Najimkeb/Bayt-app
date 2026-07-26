import { localDay } from '../gamification/rules.js';

import { DEFAULT_REMINDER_HOUR, type ReminderPreference } from './types.js';

/** Heure locale (0–23) dans le fuseau donné (repli sur UTC si invalide). */
export function localHour(now: Date, timeZone: string): number {
  try {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hour12: false,
    }).format(now);

    // `en-GB` peut rendre « 24 » à minuit sur certains runtimes → normalisé.
    return Number.parseInt(formatted, 10) % 24;
  } catch {
    return now.getUTCHours();
  }
}

/**
 * Faut-il rappeler cet apprenant **maintenant** ?
 *
 * Vrai uniquement si : les rappels sont activés, l'heure locale correspond à
 * l'heure préférée, et aucun rappel n'a déjà été envoyé aujourd'hui (dans son
 * fuseau). La présence de cartes dues est vérifiée séparément par le cas
 * d'usage — cette fonction ne décide que du *créneau*, purement.
 */
export function dueForReminder(pref: ReminderPreference, now: Date): boolean {
  if (!pref.enabled) {
    return false;
  }
  if (localHour(now, pref.timezone) !== pref.hour) {
    return false;
  }

  return pref.lastRemindedDay !== localDay(now, pref.timezone);
}

/** Préférence par défaut d'un apprenant sans réglage enregistré (désactivé). */
export function defaultReminderPreference(timezone: string): ReminderPreference {
  return { enabled: false, hour: DEFAULT_REMINDER_HOUR, timezone, lastRemindedDay: null };
}
