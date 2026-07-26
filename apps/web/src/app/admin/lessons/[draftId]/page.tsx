import type { ReactElement } from 'react';

import { DraftReviewScreen } from '@/components/admin/draft-review-screen';

/**
 * Relecture d'un brouillon de leçon sourcée — réservé aux admins.
 *
 * L'autorisation est vérifiée **côté serveur** (l'API renvoie 403). Cette page
 * ne fait qu'afficher `DraftReviewScreen`, côté client.
 */
export default async function DraftPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}): Promise<ReactElement> {
  const { draftId } = await params;

  return <DraftReviewScreen draftId={draftId} />;
}
