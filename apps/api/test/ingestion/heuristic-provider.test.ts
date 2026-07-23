import { describe, expect, it } from 'vitest';

import { parseCards } from '../../src/ingestion/card-schema.js';
import { HeuristicProvider } from '../../src/ingestion/llm/heuristic-provider.js';

describe('HeuristicProvider (fallback local)', () => {
  it('génère à partir de l\'extrait délimité, pas des consignes du prompt', async () => {
    const user = [
      'Génère au maximum 8 flashcards à partir de cet extrait.',
      'Extrait :',
      '"""',
      'La répétition espacée consiste à revoir à intervalles croissants. Elle combat la courbe de l\'oubli.',
      '"""',
    ].join('\n');

    const raw = await new HeuristicProvider().complete({ system: '', user });
    const cards = parseCards(raw);

    expect(cards.length).toBeGreaterThan(0);
    // Le contenu vient de l'extrait, pas de la phrase d'instruction.
    const backs = cards.map((c) => c.back).join(' ');
    expect(backs).toContain('répétition espacée');
    expect(backs).not.toContain('Génère au maximum');
  });

  it('produit un JSON conforme au schéma de cartes', async () => {
    const raw = await new HeuristicProvider().complete({
      system: '',
      user: '"""\nUne phrase suffisamment longue pour devenir une carte de révision.\n"""',
    });

    expect(() => parseCards(raw)).not.toThrow();
  });
});
