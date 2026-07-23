import { describe, expect, it } from 'vitest';

import { splitIntoSections } from '../../src/ingestion/chunking.js';

describe('splitIntoSections', () => {
  it('renvoie une section vide pour un texte vide', () => {
    expect(splitIntoSections('   ')).toEqual([]);
  });

  it('groupe des paragraphes courts en une section', () => {
    const text = 'Premier paragraphe.\n\nDeuxième paragraphe.';
    expect(splitIntoSections(text)).toEqual(['Premier paragraphe.\n\nDeuxième paragraphe.']);
  });

  it('ouvre une nouvelle section à chaque titre Markdown', () => {
    const text = '# Titre A\n\nContenu A.\n\n# Titre B\n\nContenu B.';
    const sections = splitIntoSections(text);

    expect(sections).toHaveLength(2);
    expect(sections[0]).toContain('Titre A');
    expect(sections[1]).toContain('Titre B');
  });

  it('respecte la taille maximale d\'une section', () => {
    const para = (n: number): string => `Paragraphe ${String(n)} ${'x'.repeat(60)}.`;
    const text = [para(1), para(2), para(3), para(4)].join('\n\n');

    const sections = splitIntoSections(text, { maxChars: 140 });

    expect(sections.length).toBeGreaterThan(1);
    for (const section of sections) {
      expect(section.length).toBeLessThanOrEqual(140);
    }
  });

  it('coupe un paragraphe démesuré sur les fins de phrase', () => {
    const long = Array.from({ length: 20 }, (_v, i) => `Phrase numéro ${String(i)}.`).join(' ');
    const sections = splitIntoSections(long, { maxChars: 80 });

    expect(sections.length).toBeGreaterThan(1);
    for (const section of sections) {
      expect(section.length).toBeLessThanOrEqual(80);
    }
  });
});
