'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useUserId } from '@/lib/auth/use-user-id';

import { BinauralEngine, type BeatPreset } from './binaural-engine';

/** Réglages de l'ambiance sonore. `enabled` n'est jamais persisté (voir plus bas). */
export interface FocusSoundState {
  readonly enabled: boolean;
  readonly preset: BeatPreset;
  readonly volume: number;
  readonly pinkNoise: boolean;
}

/** Préférences mémorisées (tout sauf `enabled` : on ne démarre jamais tout seul). */
type FocusSoundPrefs = Omit<FocusSoundState, 'enabled'>;

const DEFAULTS: FocusSoundState = {
  enabled: false,
  preset: 'alpha',
  volume: 0.5,
  pinkNoise: false,
};

/** Clé de persistance, par apprenant. */
const storageKey = (userId: string): string => `bayt-focus-sound:${userId || 'anon'}`;

/**
 * Pilote l'ambiance binaurale et mémorise les préférences **par utilisateur**
 * (localStorage).
 *
 * Deux garde-fous « jamais de son imposé » :
 * - `enabled` démarre **toujours** à `false` (jamais restauré), donc aucun son
 *   au chargement — conforme à la politique autoplay et à l'accessibilité ;
 * - seules `preset` / `volume` / `pinkNoise` sont persistées.
 */
export function useFocusSound() {
  const userId = useUserId();
  const [state, setState] = useState<FocusSoundState>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const engineRef = useRef<BinauralEngine | null>(null);

  const supported = typeof window !== 'undefined' && BinauralEngine.supported;

  // Restaure les préférences quand l'apprenant est connu — mais `enabled=false`.
  useEffect(() => {
    let prefs: Partial<FocusSoundPrefs> = {};
    try {
      const raw = window.localStorage.getItem(storageKey(userId));
      if (raw !== null) {
        prefs = JSON.parse(raw) as Partial<FocusSoundPrefs>;
      }
    } catch {
      prefs = {};
    }
    setState({ ...DEFAULTS, ...prefs, enabled: false });
    setReady(true);
  }, [userId]);

  // Mémorise les préférences (pas `enabled`).
  useEffect(() => {
    if (!ready) {
      return;
    }
    const prefs: FocusSoundPrefs = {
      preset: state.preset,
      volume: state.volume,
      pinkNoise: state.pinkNoise,
    };
    try {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
    } catch {
      /* Mode privé : on ignore, la session reste fonctionnelle. */
    }
  }, [ready, userId, state.preset, state.volume, state.pinkNoise]);

  // Applique l'état au moteur audio.
  useEffect(() => {
    if (!ready || !supported) {
      return;
    }
    const engine = engineRef.current ?? (engineRef.current = new BinauralEngine());
    if (state.enabled) {
      void engine.start({ preset: state.preset, volume: state.volume, pinkNoise: state.pinkNoise });
    } else {
      engine.stop();
    }
  }, [ready, supported, state.enabled, state.preset, state.volume, state.pinkNoise]);

  // Coupe et libère au démontage.
  useEffect(() => () => engineRef.current?.dispose(), []);

  const toggle = useCallback(() => setState((s) => ({ ...s, enabled: !s.enabled })), []);
  const stop = useCallback(() => setState((s) => ({ ...s, enabled: false })), []);
  const setPreset = useCallback((preset: BeatPreset) => setState((s) => ({ ...s, preset })), []);
  const setVolume = useCallback(
    (volume: number) => setState((s) => ({ ...s, volume: Math.min(1, Math.max(0, volume)) })),
    [],
  );
  const setPinkNoise = useCallback(
    (pinkNoise: boolean) => setState((s) => ({ ...s, pinkNoise })),
    [],
  );

  return { state, ready, supported, toggle, stop, setPreset, setVolume, setPinkNoise };
}
