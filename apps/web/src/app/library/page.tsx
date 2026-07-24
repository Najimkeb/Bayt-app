import type { ReactElement } from 'react';

import { LibraryScreen } from '@/components/library/library-screen';

/**
 * Bibliothèque — dépôt de documents et suivi de leur ingestion.
 *
 * Page serveur minimale : toute l'interaction (upload, polling, aperçu) vit
 * dans `LibraryScreen`, côté client. Le paramètre `?domain=` présélectionne le
 * domaine de rattachement (arrivée depuis l'état vide d'un domaine).
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactElement> {
  const params = await searchParams;
  const raw = params.domain;
  const initialDomainId = typeof raw === 'string' && raw !== '' ? raw : null;

  return <LibraryScreen initialDomainId={initialDomainId} />;
}
