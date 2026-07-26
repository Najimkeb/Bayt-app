'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Dictée vocale via la reconnaissance vocale du navigateur (Web Speech API).
 *
 * **Repli propre** : si l'API est absente (Firefox, certains navigateurs),
 * `supported` est `false` et l'UI se rabat sur la saisie texte. Le texte
 * reconnu est transmis via `onTranscript` (à ajouter au champ).
 */

interface RecognitionAlternative {
  readonly transcript: string;
}
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly 0: RecognitionAlternative;
}
interface RecognitionEvent {
  readonly resultIndex: number;
  readonly results: { readonly length: number; readonly [index: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

export interface SpeechRecognitionHandle {
  readonly supported: boolean;
  readonly listening: boolean;
  readonly start: () => void;
  readonly stop: () => void;
}

export function useSpeechRecognition(
  onTranscript: (text: string) => void,
  lang = 'fr-FR',
): SpeechRecognitionHandle {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  useEffect(() => {
    const win = window as unknown as {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
    const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (Ctor === undefined) {
      return;
    }

    setSupported(true);
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result?.isFinal) {
          text += result[0].transcript;
        }
      }
      if (text !== '') {
        callbackRef.current(text);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // déjà arrêtée
      }
    };
  }, [lang]);

  const start = (): void => {
    const recognition = recognitionRef.current;
    if (recognition !== null && !listening) {
      try {
        recognition.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  };

  const stop = (): void => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return { supported, listening, start, stop };
}
