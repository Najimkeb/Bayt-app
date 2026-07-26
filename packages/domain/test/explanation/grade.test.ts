import { describe, expect, it } from 'vitest';

import { gradeForComprehension } from '../../src/explanation/grade.js';

describe('gradeForComprehension', () => {
  it('erronée → Again', () => {
    expect(gradeForComprehension('erroneous', 20)).toBe('Again');
    expect(gradeForComprehension('erroneous', 80)).toBe('Again');
  });

  it('floue (incomplète / imprécise) → Hard', () => {
    expect(gradeForComprehension('incomplete', 60)).toBe('Hard');
    expect(gradeForComprehension('imprecise', 70)).toBe('Hard');
  });

  it('bonne explication → Good, ou Easy si vraiment maîtrisée', () => {
    expect(gradeForComprehension('correct', 75)).toBe('Good');
    expect(gradeForComprehension('correct', 89)).toBe('Good');
    expect(gradeForComprehension('correct', 90)).toBe('Easy');
    expect(gradeForComprehension('correct', 100)).toBe('Easy');
  });
});
