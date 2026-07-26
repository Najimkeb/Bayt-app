'use client';

/**
 * Aide côté navigateur pour les Web Push (niveau 2).
 *
 * Contrainte iOS/Safari (≥ 16.4) : le push n'est disponible **que** si la PWA est
 * installée sur l'écran d'accueil (mode standalone). Sur les autres plateformes,
 * le push fonctionne aussi dans un onglet. On détecte proprement la capacité pour
 * retomber sur le niveau 1 (rappels dans l'app) sans jamais afficher d'erreur.
 */

/** Capacité de push de l'appareil courant. */
export type PushCapability =
  /** Push disponible : on peut demander la permission (après action utilisateur). */
  | 'ready'
  /** iOS hors standalone : il faut d'abord installer la PWA sur l'écran d'accueil. */
  | 'needs-install-ios'
  /** Push non pris en charge par ce navigateur. */
  | 'unsupported';

/** L'app tourne-t-elle en mode « installée » (standalone) ? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;

  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
}

/** Appareil iOS/iPadOS (Safari) ? (iPadOS se présente parfois comme un Mac tactile). */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  const iOS = /iphone|ipad|ipod/i.test(ua);
  const iPadOs = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;

  return iOS || iPadOs;
}

/** Détermine la capacité de push de l'appareil courant. */
export function getPushCapability(): PushCapability {
  if (typeof window === 'undefined') {
    return 'unsupported';
  }
  // iOS : push impossible hors PWA installée, quel que soit le reste.
  if (isIos() && !isStandalone()) {
    return 'needs-install-ios';
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }

  return 'ready';
}

/** Convertit une clé VAPID base64url en `ArrayBuffer` (applicationServerKey). */
function urlBase64ToBuffer(base64Url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }

  return buffer;
}

/** Forme sérialisable d'un abonnement, prête pour `/push/subscribe`. */
export interface SerializedSubscription {
  readonly endpoint: string;
  readonly keys: { p256dh: string; auth: string };
}

/** Sérialise un `PushSubscription` du navigateur en JSON transportable. */
function serialize(subscription: PushSubscription): SerializedSubscription {
  const json = subscription.toJSON();
  const keys = json.keys ?? {};

  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: keys.p256dh ?? '', auth: keys.auth ?? '' },
  };
}

/** Abonnement push existant pour ce navigateur, ou `null`. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (getPushCapability() !== 'ready') {
    return null;
  }
  const registration = await navigator.serviceWorker.ready;

  return registration.pushManager.getSubscription();
}

/**
 * Demande la permission puis s'abonne. À n'appeler **qu'en réponse à une action
 * utilisateur** (exigence iOS/Safari). Renvoie l'abonnement sérialisé, ou `null`
 * si la permission est refusée / indisponible.
 */
export async function subscribeToPush(
  vapidPublicKey: string,
): Promise<SerializedSubscription | null> {
  if (getPushCapability() !== 'ready') {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(vapidPublicKey),
    }));

  return serialize(subscription);
}

/** Se désabonne côté navigateur ; renvoie l'endpoint retiré (ou `null`). */
export async function unsubscribeFromPush(): Promise<string | null> {
  const subscription = await getExistingSubscription();
  if (subscription === null) {
    return null;
  }
  const { endpoint } = subscription;
  await subscription.unsubscribe();

  return endpoint;
}
