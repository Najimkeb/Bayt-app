import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * Configuration OpenNext → Cloudflare (adaptateur officiel recommandé pour
 * déployer Next.js App Router en Worker). Défauts : pas de cache incrémental
 * externe (l'app est surtout `use client`, pas d'ISR pour l'instant) — on
 * branchera un cache (R2/KV) le jour où l'ISR entrera en jeu.
 */
export default defineCloudflareConfig();
