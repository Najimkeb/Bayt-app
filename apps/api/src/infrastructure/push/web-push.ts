import type { PushOutcome, PushPayload, PushSender } from '../../application/ports/push-sender.js';
import type { PushSubscriptionRecord } from '../../application/ports/push-subscription-repository.js';

import { fromBase64Url, toBase64Url } from './base64url.js';

/**
 * Envoi de Web Push depuis un Worker Cloudflare — **sans dépendance** : tout est
 * fait avec la WebCrypto native (disponible dans les Workers).
 *
 * Chiffrement du contenu : `aes128gcm` (RFC 8188 + RFC 8291). Authentification
 * du serveur applicatif : VAPID (RFC 8292, en-tête `Authorization: vapid`).
 * Cette classe est la **seule** à connaître ce protocole ; les cas d'usage ne
 * voient que le port `PushSender`.
 */
export interface WebPushConfig {
  /** Clé publique VAPID (base64url du point P-256 non compressé, 65 octets). */
  readonly publicKey: string;
  /** Clé privée VAPID au format JWK (secret Worker). */
  readonly privateJwk: JsonWebKey;
  /** Sujet VAPID : `mailto:...` ou une URL de contact. */
  readonly subject: string;
}

const encoder = new TextEncoder();

/** Concatène des séquences d'octets. */
function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }

  return out;
}

/** HKDF (Extract+Expand, SHA-256) via WebCrypto. */
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );

  return new Uint8Array(bits);
}

/** Origine (scheme+host) d'un endpoint — audience du jeton VAPID. */
function audienceOf(endpoint: string): string {
  return new URL(endpoint).origin;
}

/** Destinataire d'un chiffrement Web Push (clés publiques du navigateur). */
export interface PushRecipientKeys {
  /** Clé publique ECDH du client (base64url, point P-256 non compressé). */
  readonly p256dh: string;
  /** Secret d'authentification (base64url, 16 octets). */
  readonly auth: string;
}

/**
 * Chiffre `plaintext` pour un destinataire (RFC 8291, content-coding aes128gcm).
 *
 * Corps produit : `salt(16) || rs(4) || idlen(1) || as_public(65) || ciphertext`.
 * Fonction pure de crypto (hors classe) pour être testable par un aller-retour
 * chiffrement→déchiffrement, sans réseau.
 */
export async function encryptAes128Gcm(
  recipient: PushRecipientKeys,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const uaPublic = fromBase64Url(recipient.p256dh);
  const authSecret = fromBase64Url(recipient.auth);

  // Paire éphémère du serveur applicatif (clé « as »). `generateKey` renvoie une
  // union `CryptoKey | CryptoKeyPair` dans les types Workers → on précise.
  const asKeys = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const asPublic = new Uint8Array(
    (await crypto.subtle.exportKey('raw', asKeys.publicKey)) as ArrayBuffer,
  );

  // Secret ECDH partagé (as_private × ua_public). Les types Workers nomment le
  // paramètre `$public` ; le runtime accepte la clé `public` du standard WebCrypto.
  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: uaKey } as unknown as SubtleCryptoDeriveKeyAlgorithm,
      asKeys.privateKey,
      256,
    ),
  );

  // IKM = HKDF(salt=auth, ikm=ecdh, info="WebPush: info\0" || ua_public || as_public).
  const ikmInfo = concat(encoder.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, sharedSecret, ikmInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12);

  // Un seul enregistrement : délimiteur 0x02 = dernier bloc, sans remplissage.
  const record = concat(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, record),
  );

  // En-tête RFC 8188 : salt || record_size(4) || idlen(1) || keyid(as_public).
  const recordSize = new Uint8Array([0, 0, 0x10, 0]); // 4096
  const header = concat(salt, recordSize, new Uint8Array([asPublic.length]), asPublic);

  return concat(header, ciphertext);
}

export class WebPushSender implements PushSender {
  public constructor(private readonly config: WebPushConfig) {}

  public async send(
    subscription: PushSubscriptionRecord,
    payload: PushPayload,
  ): Promise<PushOutcome> {
    try {
      const body = await encryptAes128Gcm(subscription, encoder.encode(JSON.stringify(payload)));
      const jwt = await this.vapidJwt(audienceOf(subscription.endpoint));

      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `vapid t=${jwt}, k=${this.config.publicKey}`,
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
          TTL: '43200',
        },
        body,
      });

      if (response.ok) {
        return { status: 'sent' };
      }
      // Abonnement disparu : le service push l'a révoqué → à supprimer.
      if (response.status === 404 || response.status === 410) {
        return { status: 'gone' };
      }

      return { status: 'error', detail: `HTTP ${String(response.status)}` };
    } catch (error) {
      return { status: 'error', detail: error instanceof Error ? error.message : 'unknown' };
    }
  }

  /** Jeton VAPID (JWT ES256) pour l'audience donnée. */
  private async vapidJwt(audience: string): Promise<string> {
    const header = toBase64Url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const claims = toBase64Url(
      encoder.encode(
        JSON.stringify({
          aud: audience,
          exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
          sub: this.config.subject,
        }),
      ),
    );
    const signingInput = `${header}.${claims}`;

    const key = await crypto.subtle.importKey(
      'jwk',
      this.config.privateJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
    // WebCrypto ECDSA rend une signature brute R||S (64 octets) = format JWS ES256.
    const signature = new Uint8Array(
      await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        encoder.encode(signingInput),
      ),
    );

    return `${signingInput}.${toBase64Url(signature)}`;
  }
}
