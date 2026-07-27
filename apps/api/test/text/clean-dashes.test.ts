import { describe, expect, it } from 'vitest';

import { cleanDashes } from '../../src/text/clean-dashes.js';

describe('cleanDashes', () => {
  it('remplace un cadratin en incise par une virgule', () => {
    expect(cleanDashes('Paris — la capitale')).toBe('Paris, la capitale');
  });

  it('gère le demi-cadratin de la même façon', () => {
    expect(cleanDashes('Paris – la capitale')).toBe('Paris, la capitale');
  });

  it('remplace un cadratin collé entre deux mots', () => {
    expect(cleanDashes('mot—autre')).toBe('mot, autre');
  });

  it('ne double pas la ponctuation après un point/deux-points', () => {
    expect(cleanDashes('Fin. — Ensuite ceci')).toBe('Fin. Ensuite ceci');
    expect(cleanDashes('Résumé : – premier point')).toBe('Résumé : premier point');
  });

  it('retire un tiret en tête (dialogue, liste)', () => {
    expect(cleanDashes('— Bonjour')).toBe('Bonjour');
    expect(cleanDashes('Liste :\n— un\n— deux')).toBe('Liste :\nun\ndeux');
  });

  it('retire un tiret en fin', () => {
    expect(cleanDashes('à suivre —')).toBe('à suivre');
  });

  it('PRÉSERVE les traits d’union des mots composés', () => {
    expect(cleanDashes('peut-être demain')).toBe('peut-être demain');
    expect(cleanDashes('un rendez-vous à 9h')).toBe('un rendez-vous à 9h');
    expect(cleanDashes('c’est-à-dire')).toBe('c’est-à-dire');
  });

  it('laisse un texte sans cadratin intact (chemin rapide)', () => {
    const s = 'Une phrase normale, sans tiret spécial.';
    expect(cleanDashes(s)).toBe(s);
  });

  it('préserve les sauts de ligne de structure', () => {
    expect(cleanDashes('le · nom\n\n« The cat — a pet »\nLe chat')).toBe(
      'le · nom\n\n« The cat, a pet »\nLe chat',
    );
  });

  it('gère plusieurs cadratins dans une phrase', () => {
    expect(cleanDashes('A — B — C')).toBe('A, B, C');
  });
});
