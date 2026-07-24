/**
 * Moteur d'ambiance sonore — **battements binauraux** générés en direct via la
 * Web Audio API (aucun fichier audio).
 *
 * Principe : deux oscillateurs sinusoïdaux, un par oreille, écartés de la
 * fréquence cible (ex. gauche 200 Hz / droite 210 Hz → battement 10 Hz).
 * Le cerveau ne perçoit la « pulsation » que si chaque oreille reçoit sa
 * fréquence — **d'où la nécessité d'un casque**. Une couche optionnelle de
 * bruit rose (faible) masque les distractions.
 *
 * Fondus d'entrée/sortie pour éviter les clics. Le `AudioContext` n'est créé /
 * repris que sur un geste utilisateur (politique autoplay des navigateurs) :
 * `start()` est appelé depuis un clic.
 */

export type BeatPreset = 'alpha' | 'theta' | 'beta';

/** Fréquence de battement (Hz) par préréglage. */
export const BEAT_HZ: Record<BeatPreset, number> = {
  alpha: 10, // concentration détendue
  theta: 6, // calme
  beta: 16, // vigilance
};

/** Fréquence porteuse (Hz) commune, dans le grave doux pour rester agréable. */
const CARRIER_HZ = 200;
/** Durée des fondus (s) — assez longue pour ne jamais cliquer. */
const FADE_SECONDS = 0.6;
/** Gain maximal des battements (garde-fou anti-volume excessif). */
const BEAT_CEILING = 0.14;
/** Gain maximal du bruit rose — volontairement plus bas (« faible »). */
const PINK_CEILING = 0.05;

export interface BinauralSettings {
  readonly preset: BeatPreset;
  /** Volume relatif 0..1 (mis à l'échelle par les plafonds ci-dessus). */
  readonly volume: number;
  readonly pinkNoise: boolean;
}

/** `AudioContext`, avec repli `webkitAudioContext` (anciens Safari). */
function audioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };

  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Génère un tampon de **bruit rose** (filtre de Paul Kellett sur du bruit
 * blanc) bouclé — plus doux qu'un bruit blanc, idéal pour le masquage.
 */
function makePinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 4);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const out = buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  return buffer;
}

/**
 * Cycle de vie de l'ambiance. Une instance vit le temps de la page ; `start` /
 * `stop` s'enchaînent sans recréer d'`AudioContext`.
 */
export class BinauralEngine {
  #ctx: AudioContext | null = null;
  #master: GainNode | null = null;
  #beatsGain: GainNode | null = null;
  #noiseGain: GainNode | null = null;
  #left: OscillatorNode | null = null;
  #right: OscillatorNode | null = null;
  #noise: AudioBufferSourceNode | null = null;
  #running = false;

  /** L'ambiance est-elle audible (ou en train de démarrer) ? */
  public get running(): boolean {
    return this.#running;
  }

  /** L'API Web Audio est-elle disponible dans ce navigateur ? */
  public static get supported(): boolean {
    return audioContextCtor() !== null;
  }

  /**
   * Démarre l'ambiance (ou met à jour si déjà en cours). À appeler depuis un
   * geste utilisateur : crée/reprend l'`AudioContext`.
   */
  public async start(settings: BinauralSettings): Promise<void> {
    if (this.#running) {
      this.update(settings);

      return;
    }

    const Ctor = audioContextCtor();
    if (Ctor === null) {
      return;
    }

    const ctx = this.#ctx ?? new Ctor();
    this.#ctx = ctx;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const beat = BEAT_HZ[settings.preset];

    // Fondu géré par le gain maître ; le volume vit dans les gains dédiés.
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.connect(ctx.destination);

    // Battements : deux sinus séparés en canaux L/R via un ChannelMerger, pour
    // une isolation totale entre les oreilles (indispensable à l'effet).
    const beatsGain = ctx.createGain();
    beatsGain.gain.setValueAtTime(settings.volume * BEAT_CEILING, now);
    beatsGain.connect(master);

    const merger = ctx.createChannelMerger(2);
    merger.connect(beatsGain);

    const left = ctx.createOscillator();
    left.type = 'sine';
    left.frequency.setValueAtTime(CARRIER_HZ, now);
    left.connect(merger, 0, 0);

    const right = ctx.createOscillator();
    right.type = 'sine';
    right.frequency.setValueAtTime(CARRIER_HZ + beat, now);
    right.connect(merger, 0, 1);

    // Bruit rose (mono → centré), à faible niveau.
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(settings.pinkNoise ? settings.volume * PINK_CEILING : 0, now);
    noiseGain.connect(master);

    const noise = ctx.createBufferSource();
    noise.buffer = makePinkNoiseBuffer(ctx);
    noise.loop = true;
    noise.connect(noiseGain);

    left.start();
    right.start();
    noise.start();

    master.gain.linearRampToValueAtTime(1, now + FADE_SECONDS);

    this.#master = master;
    this.#beatsGain = beatsGain;
    this.#noiseGain = noiseGain;
    this.#left = left;
    this.#right = right;
    this.#noise = noise;
    this.#running = true;
  }

  /** Met à jour fréquence / volume / bruit rose en douceur, sans coupure. */
  public update(settings: BinauralSettings): void {
    if (!this.#running || this.#ctx === null) {
      return;
    }

    const now = this.#ctx.currentTime;
    const beat = BEAT_HZ[settings.preset];
    const ease = now + 0.08;

    this.#right?.frequency.linearRampToValueAtTime(CARRIER_HZ + beat, ease);
    this.#beatsGain?.gain.linearRampToValueAtTime(settings.volume * BEAT_CEILING, ease);
    this.#noiseGain?.gain.linearRampToValueAtTime(
      settings.pinkNoise ? settings.volume * PINK_CEILING : 0,
      ease,
    );
  }

  /** Coupe l'ambiance avec un fondu de sortie. Immédiate côté ressenti. */
  public stop(): void {
    if (!this.#running || this.#ctx === null || this.#master === null) {
      return;
    }

    const ctx = this.#ctx;
    const now = ctx.currentTime;
    const gain = this.#master.gain;

    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0, now + FADE_SECONDS);

    const stopAt = now + FADE_SECONDS + 0.02;
    this.#left?.stop(stopAt);
    this.#right?.stop(stopAt);
    this.#noise?.stop(stopAt);

    this.#running = false;
    this.#left = null;
    this.#right = null;
    this.#noise = null;
    this.#beatsGain = null;
    this.#noiseGain = null;
    this.#master = null;
  }

  /** Coupe et libère l'`AudioContext` (démontage du composant). */
  public dispose(): void {
    this.stop();
    void this.#ctx?.close();
    this.#ctx = null;
  }
}
