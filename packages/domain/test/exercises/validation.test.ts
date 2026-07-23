import { describe, expect, it } from 'vitest';

import {
  checkAnswer,
  matchingLefts,
  matchingRights,
  normalizeText,
  type FillBlankExercise,
  type MatchingExercise,
  type McqExercise,
} from '../../src/index.js';

const mcq: McqExercise = {
  id: 'e1',
  itemId: 'i1',
  type: 'mcq',
  prompt: 'Quel service Cloudflare est une base SQL ?',
  options: ['R2', 'D1', 'KV', 'Vectorize'],
  answerIndex: 1,
};

const fill: FillBlankExercise = {
  id: 'e2',
  itemId: 'i2',
  type: 'fill_blank',
  prompt: 'La courbe de l’oubli a été décrite par ___.',
  answer: 'Ebbinghaus',
  accept: ['Hermann Ebbinghaus'],
};

const matching: MatchingExercise = {
  id: 'e3',
  itemId: 'i3',
  type: 'matching',
  prompt: 'Associe chaque terme à sa définition.',
  pairs: [
    { left: 'Stabilité', right: 'Durée avant oubli' },
    { left: 'Difficulté', right: 'Résistance à la mémorisation' },
    { left: 'Rétrievabilité', right: 'Probabilité de rappel' },
  ],
};

describe('checkAnswer — QCM', () => {
  it('accepte la bonne option', () => {
    expect(checkAnswer(mcq, { kind: 'mcq', choice: 1 }).correct).toBe(true);
  });

  it('refuse une mauvaise option', () => {
    expect(checkAnswer(mcq, { kind: 'mcq', choice: 0 }).correct).toBe(false);
  });
});

describe('checkAnswer — texte à trous', () => {
  it('accepte la réponse exacte', () => {
    expect(checkAnswer(fill, { kind: 'fill_blank', text: 'Ebbinghaus' }).correct).toBe(true);
  });

  it('tolère la casse, les accents et les espaces superflus', () => {
    for (const text of ['  ebbinghaus ', 'EBBINGHAUS', 'ébbinghaus']) {
      expect(checkAnswer(fill, { kind: 'fill_blank', text }).correct).toBe(true);
    }
  });

  it('accepte une réponse alternative déclarée', () => {
    expect(checkAnswer(fill, { kind: 'fill_blank', text: 'hermann ebbinghaus' }).correct).toBe(true);
  });

  it('refuse une réponse vide ou fausse', () => {
    expect(checkAnswer(fill, { kind: 'fill_blank', text: '' }).correct).toBe(false);
    expect(checkAnswer(fill, { kind: 'fill_blank', text: 'Pavlov' }).correct).toBe(false);
  });
});

describe('checkAnswer — association', () => {
  const rightIdFor = (leftIndex: number): string => `R${String(leftIndex)}`;

  it('expose des identifiants stables et cohérents', () => {
    expect(matchingLefts(matching).map((s) => s.id)).toEqual(['L0', 'L1', 'L2']);
    expect(matchingRights(matching).map((s) => s.id)).toEqual(['R0', 'R1', 'R2']);
  });

  it('accepte un appariement complet et correct', () => {
    const answer = matchingLefts(matching).map((left, index) => ({
      leftId: left.id,
      rightId: rightIdFor(index),
    }));

    expect(checkAnswer(matching, { kind: 'matching', pairs: answer }).correct).toBe(true);
  });

  it('refuse un mauvais appariement', () => {
    const answer = [
      { leftId: 'L0', rightId: 'R1' },
      { leftId: 'L1', rightId: 'R0' },
      { leftId: 'L2', rightId: 'R2' },
    ];

    expect(checkAnswer(matching, { kind: 'matching', pairs: answer }).correct).toBe(false);
  });

  it('refuse un appariement incomplet ou avec doublon', () => {
    expect(
      checkAnswer(matching, {
        kind: 'matching',
        pairs: [
          { leftId: 'L0', rightId: 'R0' },
          { leftId: 'L1', rightId: 'R1' },
        ],
      }).correct,
    ).toBe(false);

    expect(
      checkAnswer(matching, {
        kind: 'matching',
        pairs: [
          { leftId: 'L0', rightId: 'R0' },
          { leftId: 'L0', rightId: 'R0' },
          { leftId: 'L2', rightId: 'R2' },
        ],
      }).correct,
    ).toBe(false);
  });
});

describe('normalizeText', () => {
  it('supprime accents, casse, ponctuation et espaces', () => {
    expect(normalizeText('  Élève, à l’École !! ')).toBe('eleve a l ecole');
  });
});

describe('checkAnswer — robustesse de type', () => {
  it('refuse une réponse du mauvais genre', () => {
    expect(checkAnswer(mcq, { kind: 'fill_blank', text: 'D1' }).correct).toBe(false);
    expect(checkAnswer(fill, { kind: 'mcq', choice: 0 }).correct).toBe(false);
  });
});
