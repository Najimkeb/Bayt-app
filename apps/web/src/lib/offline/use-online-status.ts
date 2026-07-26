'use client';

import { useEffect, useState } from 'react';

/**
 * État réseau du navigateur, réactif aux événements `online` / `offline`.
 *
 * `navigator.onLine` n'est pas infaillible (il dit surtout « interface réseau
 * active »), mais il suffit à piloter l'UI et à déclencher une tentative de
 * synchro — la synchro elle-même retente en cas d'échec réel.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = (): void => setOnline(true);
    const off = (): void => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online;
}
