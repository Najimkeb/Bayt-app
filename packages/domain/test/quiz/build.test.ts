import { describe, expect, it } from 'vitest';

import { buildQuiz } from '../../src/quiz/index.js';
import type { QuizSourceItem } from '../../src/quiz/index.js';

/** RNG déterministe (LCG) pour des tests reproductibles. */
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function items(n: number): QuizSourceItem[] {
  return Array.from({ length: n }, (_v, i) => ({
    id: `c${String(i)}`,
    front: `Question ${String(i)} ?`,
    back: `Réponse ${String(i)}`,
  }));
}

describe('buildQuiz', () => {
  it('produit le nombre de questions demandé (borné par les cartes)', () => {
    const q = buildQuiz(items(20), { count: 10, types: ['mcq', 'true_false', 'fill_blank'] }, seededRng(1));
    expect(q).toHaveLength(10);
    expect(new Set(q.map((x) => x.itemId)).size).toBe(10); // une carte = une question, sans doublon
  });

  it('borne le nombre de questions au nombre de cartes', () => {
    const q = buildQuiz(items(3), { count: 10, types: ['fill_blank'] }, seededRng(2));
    expect(q).toHaveLength(3);
  });

  it('un QCM a 4 options distinctes dont la bonne réponse', () => {
    const q = buildQuiz(items(10), { count: 5, types: ['mcq'] }, seededRng(3));
    for (const question of q) {
      expect(question.kind).toBe('mcq');
      if (question.kind === 'mcq') {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options).size).toBe(4); // pas de doublon
        expect(question.options[question.answerIndex]).toBe(question.correctAnswer);
      }
    }
  });

  it('replie le QCM sur un autre type quand il n’y a pas assez de distracteurs', () => {
    // 2 cartes seulement → impossible de faire un QCM à 4 options → repli.
    const q = buildQuiz(items(2), { count: 2, types: ['mcq'] }, seededRng(4));
    expect(q).toHaveLength(2);
    expect(q.every((x) => x.kind !== 'mcq')).toBe(true);
  });

  it('vrai/faux : l’énoncé vrai correspond à la bonne réponse, le faux non', () => {
    const q = buildQuiz(items(8), { count: 8, types: ['true_false'] }, seededRng(5));
    for (const question of q) {
      if (question.kind === 'true_false') {
        if (question.isTrue) {
          expect(question.statement).toBe(question.correctAnswer);
        } else {
          expect(question.statement).not.toBe(question.correctAnswer);
        }
      }
    }
  });

  it('ignore les cartes au recto ou verso vide', () => {
    const withEmpty: QuizSourceItem[] = [
      { id: 'ok', front: 'Q', back: 'R' },
      { id: 'empty', front: '   ', back: 'R2' },
    ];
    const q = buildQuiz(withEmpty, { count: 5, types: ['fill_blank'] }, seededRng(6));
    expect(q.map((x) => x.itemId)).toEqual(['ok']);
  });
});
