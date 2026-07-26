import { describe, expect, it } from 'vitest';

import { VocabParseError, parseVocabWords } from '../../src/ingestion/vocab/vocab-schema.js';

const WORD = {
  word: 'though',
  translation: 'bien que',
  category: 'conjonction',
  example: 'Though it rained, we went.',
  exampleTranslation: 'Bien qu’il pleuve, nous sommes allés.',
};

describe('parseVocabWords', () => {
  it('analyse une liste de mots valides', () => {
    const words = parseVocabWords(JSON.stringify({ words: [WORD] }));
    expect(words).toHaveLength(1);
    expect(words[0]?.word).toBe('though');
  });

  it('tolère un JSON encadré de texte / fences markdown', () => {
    const raw = 'Voici :\n```json\n' + JSON.stringify({ words: [WORD] }) + '\n```';
    expect(parseVocabWords(raw)).toHaveLength(1);
  });

  it('rejette un JSON illisible', () => {
    expect(() => parseVocabWords('pas du json')).toThrow(VocabParseError);
  });

  it('rejette une entrée sans les champs requis', () => {
    const raw = JSON.stringify({ words: [{ word: 'x' }] });
    expect(() => parseVocabWords(raw)).toThrow(VocabParseError);
  });
});
