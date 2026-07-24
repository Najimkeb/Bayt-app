import { describe, expect, it } from 'vitest';

import { assignNodeStates, domainProgress, type UnitWithLessons } from '../../src/catalog/index.js';

const UNITS: readonly UnitWithLessons[] = [
  {
    id: 'u1',
    title: 'Unité 1',
    lessons: [
      { id: 'l1', title: 'A' },
      { id: 'l2', title: 'B' },
    ],
  },
  {
    id: 'u2',
    title: 'Unité 2',
    lessons: [
      { id: 'l3', title: 'C' },
      { id: 'l4', title: 'D' },
    ],
  },
];

describe('assignNodeStates', () => {
  it('rend la première leçon disponible et le reste verrouillé sans complétion', () => {
    const path = assignNodeStates(UNITS, new Set());

    expect(path[0]?.lessons.map((l) => l.state)).toEqual(['available', 'locked']);
    expect(path[1]?.lessons.map((l) => l.state)).toEqual(['locked', 'locked']);
  });

  it('débloque la suivante à travers les unités (ordre global)', () => {
    const path = assignNodeStates(UNITS, new Set(['l1', 'l2']));

    expect(path[0]?.lessons.map((l) => l.state)).toEqual(['completed', 'completed']);
    // La première non terminée est `l3`, dans l'unité suivante.
    expect(path[1]?.lessons.map((l) => l.state)).toEqual(['available', 'locked']);
  });

  it('marque toutes terminées quand tout est complété', () => {
    const path = assignNodeStates(UNITS, new Set(['l1', 'l2', 'l3', 'l4']));

    expect(path.flatMap((u) => u.lessons.map((l) => l.state))).toEqual([
      'completed',
      'completed',
      'completed',
      'completed',
    ]);
  });

  it('une seule leçon `available` sur tout le chemin', () => {
    const states = assignNodeStates(UNITS, new Set(['l1'])).flatMap((u) =>
      u.lessons.map((l) => l.state),
    );

    expect(states.filter((s) => s === 'available')).toHaveLength(1);
  });
});

describe('domainProgress', () => {
  it('compte les leçons terminées sur le total', () => {
    expect(domainProgress(['l1', 'l2', 'l3'], new Set(['l1', 'l3']))).toEqual({
      completed: 2,
      total: 3,
    });
  });

  it('ignore une complétion hors du domaine (borne par le total)', () => {
    expect(domainProgress(['l1'], new Set(['l1', 'autre']))).toEqual({ completed: 1, total: 1 });
  });

  it('domaine vide → 0 / 0', () => {
    expect(domainProgress([], new Set(['l1']))).toEqual({ completed: 0, total: 0 });
  });
});
