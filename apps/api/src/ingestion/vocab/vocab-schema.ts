import { z } from 'zod';

import { extractJson } from '../card-schema.js';

/**
 * Contrat d'un mot de vocabulaire produit par le LLM.
 *
 * Un mot = l'entrée anglaise + sa traduction française, sa catégorie
 * grammaticale, une phrase d'exemple en anglais et sa traduction. Ces champs
 * nourrissent une flashcard riche (recto = mot, verso = sens + exemple).
 */
export const vocabWordSchema = z.object({
  /** Le mot anglais (entrée). */
  word: z.string().trim().min(1).max(60),
  /** Traduction française. */
  translation: z.string().trim().min(1).max(200),
  /** Catégorie grammaticale (nom, verbe, adjectif…). */
  category: z.string().trim().min(1).max(40),
  /** Phrase d'exemple en anglais. */
  example: z.string().trim().min(3).max(300),
  /** Traduction française de la phrase d'exemple. */
  exampleTranslation: z.string().trim().min(3).max(300),
});

export const vocabWordsSchema = z.object({
  words: z.array(vocabWordSchema).max(40),
});

export type VocabWord = z.infer<typeof vocabWordSchema>;

/** JSON Schema (JSON Mode) — miroir du contrat ; la validation zod reste juge. */
export const VOCAB_WORDS_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    words: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          translation: { type: 'string' },
          category: { type: 'string' },
          example: { type: 'string' },
          exampleTranslation: { type: 'string' },
        },
        required: ['word', 'translation', 'category', 'example', 'exampleTranslation'],
      },
    },
  },
  required: ['words'],
};

/** Erreur : la sortie n'est pas un JSON de mots de vocabulaire valide. */
export class VocabParseError extends Error {
  public override readonly name = 'VocabParseError';
}

/** Analyse et valide la sortie du LLM en liste de mots. */
export function parseVocabWords(raw: string): VocabWord[] {
  let json: unknown;
  try {
    json = JSON.parse(extractJson(raw));
  } catch {
    throw new VocabParseError('JSON illisible');
  }

  const result = vocabWordsSchema.safeParse(json);
  if (!result.success) {
    throw new VocabParseError('Structure de mots invalide');
  }

  return result.data.words;
}
