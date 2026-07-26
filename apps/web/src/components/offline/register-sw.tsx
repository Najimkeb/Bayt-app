'use client';

import { useEffect } from 'react';

/**
 * Enregistre le service worker (démarrage hors-ligne de la coquille).
 *
 * Silencieux et sans rendu : un échec d'enregistrement (navigateur sans SW,
 * contexte non sécurisé) n'empêche jamais l'app de fonctionner en ligne.
 */
export function RegisterServiceWorker(): null {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    const register = (): void => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Enregistrement impossible : on continue sans offline, sans bruit.
      });
    };
    // Après le chargement pour ne pas concurrencer le rendu initial.
    if (document.readyState === 'complete') {
      register();

      return;
    }
    window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
