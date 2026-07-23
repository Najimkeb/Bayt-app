import { describe, expect, it } from 'vitest';

import { gradeForOutcome } from '../../src/index.js';

describe('gradeForOutcome', () => {
  it('faux → Again', () => {
    expect(gradeForOutcome({ correct: false, assisted: false })).toBe('Again');
    expect(gradeForOutcome({ correct: false, assisted: true })).toBe('Again');
  });

  it('juste du premier coup → Good', () => {
    expect(gradeForOutcome({ correct: true, assisted: false })).toBe('Good');
  });

  it('juste après un essai raté ou un indice → Hard', () => {
    expect(gradeForOutcome({ correct: true, assisted: true })).toBe('Hard');
  });

  it('ne produit jamais Easy', () => {
    const grades = [
      gradeForOutcome({ correct: true, assisted: false }),
      gradeForOutcome({ correct: true, assisted: true }),
      gradeForOutcome({ correct: false, assisted: false }),
    ];

    expect(grades).not.toContain('Easy');
  });
});
