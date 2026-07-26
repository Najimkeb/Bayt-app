'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { countPending, PENDING_CHANGED_EVENT } from './db';
import { syncPending } from './sync';
import { useOnlineStatus } from './use-online-status';

interface SyncState {
  readonly online: boolean;
  /** Révisions hors-ligne en attente de synchro. */
  readonly pending: number;
  readonly syncing: boolean;
  /** Vient de terminer une synchro avec succès (pour un retour visuel bref). */
  readonly justSynced: boolean;
}

const SyncContext = createContext<SyncState>({
  online: true,
  pending: 0,
  syncing: false,
  justSynced: false,
});

export function useSync(): SyncState {
  return useContext(SyncContext);
}

/**
 * Pilote la synchronisation des révisions hors-ligne : suit la file en attente,
 * la synchronise automatiquement au retour du réseau (et au montage), et expose
 * l'état au reste de l'UI (indicateur réseau, badge de synchro).
 */
export function SyncProvider({ children }: { children: ReactNode }): ReactElement {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const runningRef = useRef(false);

  const refreshCount = useCallback(async () => {
    setPending(await countPending());
  }, []);

  const runSync = useCallback(async () => {
    if (runningRef.current || !navigator.onLine) {
      return;
    }
    runningRef.current = true;
    setSyncing(true);
    const outcome = await syncPending();
    setSyncing(false);
    runningRef.current = false;
    setPending(outcome.remaining);

    if (outcome.synced > 0) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
      // Les cartes revues hors-ligne sont désormais côté serveur : on rafraîchit.
      void queryClient.invalidateQueries({ queryKey: ['queue'] });
    }
  }, [queryClient]);

  // Compte initial + synchro au montage.
  useEffect(() => {
    void refreshCount();
    void runSync();
  }, [refreshCount, runSync]);

  // Re-synchronise dès le retour en ligne.
  useEffect(() => {
    if (online) {
      void runSync();
    }
  }, [online, runSync]);

  // Réagit aux changements de la file (nouvelle révision hors-ligne, purge).
  useEffect(() => {
    const onChange = (): void => void refreshCount();
    window.addEventListener(PENDING_CHANGED_EVENT, onChange);

    return () => window.removeEventListener(PENDING_CHANGED_EVENT, onChange);
  }, [refreshCount]);

  const value = useMemo<SyncState>(
    () => ({ online, pending, syncing, justSynced }),
    [online, pending, syncing, justSynced],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
