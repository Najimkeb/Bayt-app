import type { ReactElement } from 'react';

import { ReviewSession } from '@/components/review/review-session';

/**
 * Ecran de revision — la tranche verticale n°1 de BAYT.
 *
 * Page serveur minimale : toute l'interaction vit dans `ReviewSession`, cote
 * client, car la session depend du cache TanStack Query et du clavier.
 */
export default function ReviewPage(): ReactElement {
  return <ReviewSession />;
}
