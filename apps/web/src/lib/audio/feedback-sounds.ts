'use client';

/**
 * Effets sonores **ponctuels** de feedback (réponse juste / à revoir), générés
 * en direct via la Web Audio API — **aucun fichier audio**.
 *
 * Distinct de l'ambiance binaurale (`binaural-engine.ts`) : ce sont des sons
 * courts (< 0,3 s), avec leur **propre réglage** (interrupteur « Sons »), activé
 * par défaut. Le feedback visuel reste toujours présent : le son n'est jamais la
 * seule indication (WCAG 1.4.1).
 *
 * Politique navigateur : l'`AudioContext` n'est créé/repris que sur un geste
 * utilisateur (`primeSound`, appelé depuis les gestionnaires de clic/clavier).
 * Repli silencieux si Web Audio est indisponible.
 */

const STORAGE_KEY = 'bayt:sound-effects';
/** Événement diffusé quand la préférence change (pour l'UI de réglage). */
export const SOUND_PREF_EVENT = 'bayt:sound-effects-changed';

/** Volume modéré (garde-fou anti-son agressif). */
const GAIN = 0.16;

let context: AudioContext | null = null;
let enabled = readInitialPref();

/** Lit la préférence initiale : activé par défaut, sauf opt-out explicite. */
function readInitialPref(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

/** Constructeur `AudioContext`, avec repli `webkitAudioContext` (Safari ancien). */
function audioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };

  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Ouvre (paresseusement) l'`AudioContext`, ou `null` si Web Audio indisponible. */
function getContext(): AudioContext | null {
  if (context !== null) {
    return context;
  }
  const Ctor = audioContextCtor();
  if (Ctor === null) {
    return null;
  }
  try {
    context = new Ctor();
  } catch {
    return null;
  }

  return context;
}

/**
 * À appeler depuis un **geste utilisateur** (clic « Vérifier », note au clavier…)
 * pour créer/reprendre l'`AudioContext` avant que le son ne soit joué depuis un
 * callback asynchrone. Sans effet si Web Audio est indisponible.
 */
export function primeSound(): void {
  const ctx = getContext();
  if (ctx !== null && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

/** Joue une note sinusoïdale douce, avec enveloppe attaque/déclin (anti-clic). */
function tone(
  ctx: AudioContext,
  { freq, start, duration }: { freq: number; start: number; duration: number },
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, start);

  // Enveloppe : attaque brève, déclin exponentiel → pas de clic, son « rond ».
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(GAIN, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Prépare le contexte et renvoie l'instant de départ, ou `null` si indispo/désactivé. */
function begin(): { ctx: AudioContext; t: number } | null {
  if (!enabled) {
    return null;
  }
  const ctx = getContext();
  if (ctx === null) {
    return null;
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  return { ctx, t: ctx.currentTime };
}

/** Réponse correcte : deux notes montantes, brèves et agréables (« ding » positif). */
export function playCorrect(): void {
  const b = begin();
  if (b === null) {
    return;
  }
  tone(b.ctx, { freq: 660, start: b.t, duration: 0.12 }); // E5
  tone(b.ctx, { freq: 988, start: b.t + 0.09, duration: 0.16 }); // B5
}

/** Réponse à revoir : deux notes descendantes, douces et neutres (jamais agressif). */
export function playWrong(): void {
  const b = begin();
  if (b === null) {
    return;
  }
  tone(b.ctx, { freq: 392, start: b.t, duration: 0.14 }); // G4
  tone(b.ctx, { freq: 311, start: b.t + 0.1, duration: 0.2 }); // E♭4
}

/** Préférence courante (activé par défaut). */
export function isSoundEnabled(): boolean {
  return enabled;
}

/** Change et persiste la préférence, puis notifie l'UI. */
export function setSoundEnabled(value: boolean): void {
  enabled = value;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      // Stockage indisponible (navigation privée…) : la préférence reste en mémoire.
    }
    window.dispatchEvent(new Event(SOUND_PREF_EVENT));
  }
}
