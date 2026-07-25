import type { ReactElement } from 'react';

import { ProfileScreen } from '@/components/profile/profile-screen';

/**
 * Écran Profil — identité, statistiques et suivi de progression.
 *
 * Page serveur minimale : toute l'interaction (données, graphiques, réglages)
 * vit dans `ProfileScreen`, côté client.
 */
export default function ProfilePage(): ReactElement {
  return <ProfileScreen />;
}
