import { describe, expect, it } from 'vitest';

import { fromBase64Url, toBase64Url } from '../../src/infrastructure/push/base64url.js';
import { encryptAes128Gcm } from '../../src/infrastructure/push/web-push.js';

/**
 * Vérifie le chiffrement Web Push (RFC 8291, aes128gcm) par **aller-retour** :
 * on joue le rôle du navigateur (génère une paire ECDH + secret auth), on chiffre
 * avec `encryptAes128Gcm`, puis on **déchiffre** en refaisant le protocole à
 * l'envers. Si le clair ressort identique, toute la chaîne (ECDH → HKDF → AES-GCM
 * → en-tête RFC 8188) est correcte — sans avoir besoin d'un vrai service push.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }

  return out;
}

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

/** Génère un abonnement de navigateur factice (paire ECDH + secret auth). */
async function fakeSubscription(): Promise<{
  keys: { p256dh: string; auth: string };
  privateKey: CryptoKey;
}> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const rawPublic = new Uint8Array(
    (await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer,
  );
  const auth = crypto.getRandomValues(new Uint8Array(16));

  return {
    keys: { p256dh: toBase64Url(rawPublic), auth: toBase64Url(auth) },
    privateKey: pair.privateKey,
  };
}

/** Déchiffre un corps aes128gcm côté « navigateur ». */
async function decrypt(
  body: Uint8Array,
  uaPublicRaw: Uint8Array,
  authSecret: Uint8Array,
  uaPrivate: CryptoKey,
): Promise<Uint8Array> {
  const salt = body.subarray(0, 16);
  const idlen = body[20] ?? 0;
  const asPublic = body.subarray(21, 21 + idlen);
  const ciphertext = body.subarray(21 + idlen);

  const asKey = await crypto.subtle.importKey(
    'raw',
    asPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: asKey } as unknown as SubtleCryptoDeriveKeyAlgorithm,
      uaPrivate,
      256,
    ),
  );

  const ikmInfo = concat(encoder.encode('WebPush: info\0'), uaPublicRaw, asPublic);
  const ikm = await hkdf(authSecret, sharedSecret, ikmInfo, 32);
  const cek = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['decrypt']);
  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, ciphertext),
  );

  // Retire le délimiteur d'enregistrement final (0x02).
  return plaintext.subarray(0, plaintext.length - 1);
}

describe('encryptAes128Gcm (Web Push RFC 8291)', () => {
  it('produit un corps déchiffrable par le destinataire', async () => {
    const ua = await fakeSubscription();
    const message = JSON.stringify({ title: 'BAYT', body: 'Tu as 3 cartes à réviser 🐝' });

    const body = await encryptAes128Gcm(ua.keys, encoder.encode(message));

    const decrypted = await decrypt(
      body,
      fromBase64Url(ua.keys.p256dh),
      fromBase64Url(ua.keys.auth),
      ua.privateKey,
    );
    expect(decoder.decode(decrypted)).toBe(message);
  });

  it('produit un en-tête RFC 8188 bien formé (salt 16 + clé publique 65)', async () => {
    const ua = await fakeSubscription();
    const body = await encryptAes128Gcm(ua.keys, encoder.encode('x'));

    // idlen (octet 20) = 65 (point P-256 non compressé).
    expect(body[20]).toBe(65);
    // record size (octets 16..20) = 4096.
    expect([body[16], body[17], body[18], body[19]]).toEqual([0, 0, 0x10, 0]);
  });

  it('chiffre différemment à chaque appel (sel + clé éphémère aléatoires)', async () => {
    const ua = await fakeSubscription();
    const a = await encryptAes128Gcm(ua.keys, encoder.encode('même message'));
    const b = await encryptAes128Gcm(ua.keys, encoder.encode('même message'));

    expect(toBase64Url(a)).not.toBe(toBase64Url(b));
  });
});
