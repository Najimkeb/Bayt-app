import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

/** Racine du monorepo — evite que Turbopack la devine depuis un lockfile voisin. */
const monorepoRoot = fileURLToPath(new URL('../..', import.meta.url));

// Le proxy « même origine » n'est PAS un rewrite Next (non supporté en externe
// par OpenNext) mais un Route Handler serveur : `app/api/[...path]/route.ts`.

const config: NextConfig = {
  reactStrictMode: true,
  /** Le paquet de composants partages est compile depuis le workspace. */
  transpilePackages: ['@bayt/ui'],
  turbopack: { root: monorepoRoot },
  // L'indicateur de dev flottant chevauchait la barre de navigation basse
  // (mobile) : on le désactive pour garder le bas de l'écran propre.
  devIndicators: false,
  // Cache des pages : contrôlé via `public/_headers` (Workers Assets), pas ici —
  // OpenNext sert le HTML statique par le binding Assets, qui court-circuite
  // `headers()` de Next.
};

export default config;
