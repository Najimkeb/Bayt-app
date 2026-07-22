/**
 * `@bayt/web` — application Next.js (App Router) de BAYT.
 *
 * Squelette : Next.js, Tailwind et Framer Motion sont installes a l'etape
 * suivante, avec l'ecran de revision de la tranche verticale n°1. Ce fichier
 * n'existe que pour prouver que le paquet compile et voit ses dependances
 * de workspace.
 */

import { DOMAIN_VERSION } from '@bayt/domain';
import { UI_PACKAGE_NAME } from '@bayt/ui';

/** Verifie a la compilation que les paquets partages sont bien resolus. */
export const WEB_BUILD_INFO = {
  name: '@bayt/web',
  domainVersion: DOMAIN_VERSION,
  uiPackage: UI_PACKAGE_NAME,
} as const;
