/**
 * `@bayt/api` — Worker Cloudflare (Hono) qui exposera l'API REST de BAYT.
 *
 * Squelette : ni Hono, ni bindings D1/KV/R2 pour l'instant. Le Worker ne fera
 * qu'orchestrer `@bayt/domain` (cf. lessons.md L003) — la premiere route reelle
 * sera `GET /reviews/queue` de la tranche verticale « Reviser une carte ».
 */

import { DOMAIN_VERSION } from '@bayt/domain';

/** Metadonnees exposees plus tard par une route de sante `/health`. */
export const API_INFO = {
  name: '@bayt/api',
  domainVersion: DOMAIN_VERSION,
} as const;
