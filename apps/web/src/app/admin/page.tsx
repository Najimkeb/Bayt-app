import type { ReactElement } from 'react';

import { AdminScreen } from '@/components/admin/admin-screen';

/**
 * Panneau d'administration — réservé aux admins.
 *
 * L'autorisation réelle est vérifiée **côté serveur** (l'API renvoie 403 à un
 * non-admin) ; cette page ne fait qu'afficher `AdminScreen`, côté client.
 */
export default function AdminPage(): ReactElement {
  return <AdminScreen />;
}
