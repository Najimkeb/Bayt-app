import type { ReminderPreference } from '@bayt/domain';

/** Réglages modifiables d'un rappel (le jour de dernier envoi reste géré serveur). */
export interface ReminderSettings {
  readonly enabled: boolean;
  readonly hour: number;
  readonly timezone: string;
}

/** Une préférence avec son propriétaire — pour le balayage du CRON. */
export interface OwnedReminderPreference {
  readonly userId: string;
  readonly preference: ReminderPreference;
}

/**
 * Port de persistance des préférences de rappel.
 *
 * Volontairement étroit : la couche application ne connaît que ce contrat, donc
 * les cas d'usage se testent avec une implémentation en mémoire, sans D1.
 */
export interface ReminderRepository {
  /** Préférence d'un apprenant, ou `null` si aucun réglage enregistré. */
  get(userId: string): Promise<ReminderPreference | null>;

  /**
   * Enregistre les réglages (upsert) en **préservant** `lastRemindedDay` — un
   * changement d'heure ne doit pas rouvrir un créneau déjà honoré aujourd'hui.
   */
  save(userId: string, settings: ReminderSettings): Promise<ReminderPreference>;

  /** Toutes les préférences **activées** — base du balayage périodique du CRON. */
  enabledPreferences(): Promise<readonly OwnedReminderPreference[]>;

  /** Marque le jour local (`YYYY-MM-DD`) où un rappel vient d'être envoyé. */
  markReminded(userId: string, day: string): Promise<void>;
}
