import type { ReactElement } from 'react';

import { ReviewSession } from '@/components/review/review-session';

/**
 * Ecran de revision — la tranche verticale n°1 de BAYT.
 *
 * Page serveur minimale : toute l'interaction vit dans `ReviewSession`, cote
 * client, car la session depend du cache TanStack Query et du clavier. Le
 * paramètre `?domain=` filtre la révision sur un domaine (absent = tous).
 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactElement> {
  const params = await searchParams;
  const raw = params.domain;
  const domainId = typeof raw === 'string' && raw !== '' ? raw : undefined;

  return <ReviewSession domainId={domainId} />;
}
