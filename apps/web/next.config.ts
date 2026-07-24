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
};

export default config;
