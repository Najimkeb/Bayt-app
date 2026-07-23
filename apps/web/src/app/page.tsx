import type { ReactElement } from 'react';

import { HomeScreen } from '@/components/home/home-screen';

/**
 * Accueil de BAYT — point d'entrée de l'app : carte « Réviser » + chemin de
 * progression à nœuds.
 */
export default function HomePage(): ReactElement {
  return <HomeScreen />;
}
