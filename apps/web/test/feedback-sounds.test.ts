import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isSoundEnabled,
  playCorrect,
  playWrong,
  setSoundEnabled,
} from '@/lib/audio/feedback-sounds';

/** Compteur d'oscillateurs créés (preuve qu'un son a été programmé). */
let oscillators = 0;

class FakeParam {
  setValueAtTime(): void {}
  exponentialRampToValueAtTime(): void {}
}
class FakeNode {
  public readonly frequency = new FakeParam();
  public readonly gain = new FakeParam();
  public type = '';
  connect(): FakeNode {
    return this;
  }
  start(): void {}
  stop(): void {}
}
class FakeAudioContext {
  public state = 'running';
  public currentTime = 0;
  public readonly destination = {};
  createOscillator(): FakeNode {
    oscillators += 1;
    return new FakeNode();
  }
  createGain(): FakeNode {
    return new FakeNode();
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
}

beforeEach(() => {
  oscillators = 0;
  setSoundEnabled(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('feedback-sounds', () => {
  it('ne lève jamais quand Web Audio est indisponible (repli silencieux)', () => {
    // jsdom n'a pas d'AudioContext.
    expect(() => {
      playCorrect();
      playWrong();
    }).not.toThrow();
    expect(oscillators).toBe(0);
  });

  it('programme des notes quand activé et Web Audio présent', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);

    playCorrect();
    expect(oscillators).toBe(2); // deux notes montantes

    oscillators = 0;
    playWrong();
    expect(oscillators).toBe(2); // deux notes descendantes
  });

  it('ne joue rien quand la préférence est désactivée', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    setSoundEnabled(false);

    playCorrect();
    playWrong();
    expect(oscillators).toBe(0);
  });

  it('persiste la préférence et est activé par défaut', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    expect(window.localStorage.getItem('bayt:sound-effects')).toBe('0');

    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
    expect(window.localStorage.getItem('bayt:sound-effects')).toBe('1');
  });
});
