'use client';

import { useEffect, useState } from 'react';

import { isSoundEnabled, setSoundEnabled, SOUND_PREF_EVENT } from './feedback-sounds';

/**
 * État réactif de la préférence « Sons » pour l'UI de réglage.
 *
 * La source de vérité est le module `feedback-sounds` (persisté en localStorage).
 * On lit la vraie valeur après montage pour éviter tout écart d'hydratation SSR
 * (le serveur ne connaît pas localStorage), et on suit les changements.
 */
export function useSoundSetting(): { enabled: boolean; setEnabled: (value: boolean) => void } {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
    const sync = (): void => setEnabled(isSoundEnabled());
    window.addEventListener(SOUND_PREF_EVENT, sync);

    return () => window.removeEventListener(SOUND_PREF_EVENT, sync);
  }, []);

  return {
    enabled,
    setEnabled: (value: boolean) => {
      setSoundEnabled(value);
      setEnabled(value);
    },
  };
}
