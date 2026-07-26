/**
 * Contexte « Rappels de révision » — décide *quand* rappeler à un apprenant qu'il
 * a des cartes dues, sans jamais toucher au moteur mémoire (FSRS).
 *
 * Logique **pure** : aucune dépendance Cloudflare/Next. Le fuseau et l'heure de
 * l'apprenant décident du moment ; l'infrastructure (CRON, push) ne fait
 * qu'exécuter la décision.
 */

/** Heure quotidienne de rappel par défaut (9h locale). */
export const DEFAULT_REMINDER_HOUR = 9;

/** Préférence de rappel d'un apprenant. */
export interface ReminderPreference {
  /** Rappels activés ? Jamais de notification tant que ce n'est pas explicite. */
  readonly enabled: boolean;
  /** Heure locale préférée (0–23). */
  readonly hour: number;
  /** Fuseau IANA de l'apprenant (ex. `Europe/Paris`). */
  readonly timezone: string;
  /**
   * Dernier jour local (`YYYY-MM-DD`) où un rappel a été envoyé — garantit **au
   * plus un rappel par jour**. `null` = jamais rappelé.
   */
  readonly lastRemindedDay: string | null;
}
