import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

/** Racine du monorepo — evite que Turbopack la devine depuis un lockfile voisin. */
const monorepoRoot = fileURLToPath(new URL('../..', import.meta.url));

const config: NextConfig = {
  reactStrictMode: true,
  /** Le paquet de composants partages est compile depuis le workspace. */
  transpilePackages: ['@bayt/ui'],
  turbopack: { root: monorepoRoot },
};

export default config;
