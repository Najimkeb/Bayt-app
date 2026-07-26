/** Un abonnement Web Push (clés fournies par le navigateur). */
export interface PushSubscriptionInput {
  readonly endpoint: string;
  /** Clé publique ECDH du client (base64url). */
  readonly p256dh: string;
  /** Secret d'authentification (base64url, 16 octets). */
  readonly auth: string;
}

/** Un abonnement stocké, avec son propriétaire. */
export interface PushSubscriptionRecord extends PushSubscriptionInput {
  readonly id: string;
  readonly userId: string;
}

/**
 * Port de persistance des abonnements Web Push.
 *
 * L'`endpoint` identifie de façon unique un abonnement : le réenregistrer (même
 * navigateur, nouvelles clés) met à jour l'existant plutôt que d'en créer un
 * doublon.
 */
export interface PushSubscriptionRepository {
  /** Enregistre (upsert par `endpoint`) un abonnement pour un apprenant. */
  save(userId: string, subscription: PushSubscriptionInput): Promise<void>;

  /** Supprime un abonnement par endpoint (révoqué, ou 404/410 à l'envoi). */
  deleteByEndpoint(endpoint: string): Promise<void>;

  /** Abonnements d'un apprenant (un appareil peut en avoir plusieurs). */
  findByUser(userId: string): Promise<readonly PushSubscriptionRecord[]>;
}
