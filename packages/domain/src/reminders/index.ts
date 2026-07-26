/**
 * Contexte « Rappels de révision » — quand rappeler, dans le fuseau de
 * l'apprenant, au plus une fois par jour. Pur et testable en isolation.
 */

export { DEFAULT_REMINDER_HOUR, type ReminderPreference } from './types.js';
export { dueForReminder, localHour, defaultReminderPreference } from './policy.js';
