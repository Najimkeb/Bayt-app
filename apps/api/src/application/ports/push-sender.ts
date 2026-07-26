import type { PushSubscriptionRecord } from './push-subscription-repository.js';

/** Contenu d'une notification de rappel. */
export interface PushPayload {
  readonly title: string;
  readonly body: string;
  /** URL ouverte au clic (la session de révision). */
  readonly url: string;
}

/** Issue d'un envoi push. */
export type PushOutcome =
  /** Livré (ou accepté par le service push). */
  | { readonly status: 'sent' }
  /** Abonnement révoqué (404/410) : à supprimer, ne plus jamais réessayer. */
  | { readonly status: 'gone' }
  /** Échec transitoire (réseau, 429, 5xx) : on réessaiera au prochain créneau. */
  | { readonly status: 'error'; readonly detail: string };

/**
 * Port d'envoi d'un Web Push. L'implémentation (chiffrement RFC 8291 + VAPID)
 * vit dans l'infrastructure ; les cas d'usage ne connaissent que ce contrat, ce
 * qui les rend testables avec un envoyeur factice.
 */
export interface PushSender {
  send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<PushOutcome>;
}
