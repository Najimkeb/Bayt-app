import { describe, expect, it } from 'vitest';

import { fillCloze, hasCloze, parseCloze } from '@/lib/cloze';

describe('parseCloze', () => {
  it('découpe un trou simple en texte + blanc + texte', () => {
    expect(parseCloze('La capitale est {{c1::Paris}}.')).toEqual([
      { kind: 'text', value: 'La capitale est ' },
      { kind: 'blank', answer: 'Paris', hint: null, group: 1 },
      { kind: 'text', value: '.' },
    ]);
  });

  it('capture l\'indice de la forme réponse::indice', () => {
    expect(parseCloze('Le {{c1::renard::animal}} rusé')).toEqual([
      { kind: 'text', value: 'Le ' },
      { kind: 'blank', answer: 'renard', hint: 'animal', group: 1 },
      { kind: 'text', value: ' rusé' },
    ]);
  });

  it('gère plusieurs trous et plusieurs groupes', () => {
    const segments = parseCloze('{{c1::A}} puis {{c2::B}} enfin {{c1::C}}');

    expect(segments.filter((s) => s.kind === 'blank')).toEqual([
      { kind: 'blank', answer: 'A', hint: null, group: 1 },
      { kind: 'blank', answer: 'B', hint: null, group: 2 },
      { kind: 'blank', answer: 'C', hint: null, group: 1 },
    ]);
  });

  it('renvoie un unique segment texte quand il n\'y a aucun trou', () => {
    expect(parseCloze('Aucun trou ici')).toEqual([{ kind: 'text', value: 'Aucun trou ici' }]);
  });

  it('ne laisse jamais fuir la syntaxe brute', () => {
    for (const segment of parseCloze('Debut {{c1::x::y}} milieu {{c2::z}} fin')) {
      expect(segment.kind === 'text' ? segment.value : '').not.toMatch(/\{\{|\}\}/);
    }
  });

  it('conserve les accents dans la réponse et l\'indice', () => {
    expect(parseCloze('{{c1::mémoire::à long terme}}')).toEqual([
      { kind: 'blank', answer: 'mémoire', hint: 'à long terme', group: 1 },
    ]);
  });
});

describe('hasCloze', () => {
  it('détecte la présence d\'un trou', () => {
    expect(hasCloze('rien')).toBe(false);
    expect(hasCloze('un {{c1::trou}}')).toBe(true);
  });

  it('reste stable sur plusieurs appels (pas d\'état de regex résiduel)', () => {
    expect(hasCloze('un {{c1::trou}}')).toBe(true);
    expect(hasCloze('un {{c1::trou}}')).toBe(true);
  });
});

describe('fillCloze', () => {
  it('reconstruit la phrase complète, sans syntaxe', () => {
    expect(fillCloze('La courbe de {{c1::Ebbinghaus::savant}} est nette')).toBe(
      'La courbe de Ebbinghaus est nette',
    );
  });
});
