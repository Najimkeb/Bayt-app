import type { ReactElement } from 'react';

import { LibraryScreen } from '@/components/library/library-screen';

/**
 * Bibliothèque — dépôt de documents et suivi de leur ingestion.
 *
 * Page serveur minimale : toute l'interaction (upload, polling, aperçu) vit
 * dans `LibraryScreen`, côté client.
 */
export default function LibraryPage(): ReactElement {
  return <LibraryScreen />;
}
