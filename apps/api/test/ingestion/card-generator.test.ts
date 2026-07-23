import { describe, expect, it, vi } from 'vitest';

import { CardGenerationError, CardGenerator } from '../../src/ingestion/card-generator.js';
import type { LLMProvider } from '../../src/ingestion/llm/provider.js';

/** Provider factice : renvoie des réponses scriptées, sans réseau. */
function provider(responses: string[]): LLMProvider {
  const queue = [...responses];
  return {
    complete: vi.fn(() => Promise.resolve(queue.shift() ?? '')),
  };
}

const VALID = JSON.stringify({
  cards: [
    { front: 'Que force le rappel actif ?', back: 'Retrouver de mémoire.' },
    { front: 'Rôle de la répétition espacée ?', back: 'Revoir à intervalles croissants.' },
  ],
});

describe('CardGenerator', () => {
  it('produit des cartes validées depuis une sortie JSON correcte', async () => {
    const generator = new CardGenerator(provider([VALID]));
    const cards = await generator.generate('Un extrait de cours.');

    expect(cards).toHaveLength(2);
    expect(cards[0]?.front).toContain('rappel actif');
  });

  it('accepte du JSON entouré de balises Markdown', async () => {
    const fenced = '```json\n' + VALID + '\n```';
    const cards = await new CardGenerator(provider([fenced])).generate('Extrait.');

    expect(cards).toHaveLength(2);
  });

  it('retente après une sortie invalide, puis réussit', async () => {
    const p = provider(['ceci n\'est pas du JSON', VALID]);
    const cards = await new CardGenerator(p, { maxAttempts: 2 }).generate('Extrait.');

    expect(cards).toHaveLength(2);
    expect(p.complete).toHaveBeenCalledTimes(2);
  });

  it('échoue proprement si la sortie reste invalide', async () => {
    const p = provider(['pas du json', 'toujours pas', 'non plus']);
    await expect(
      new CardGenerator(p, { maxAttempts: 2 }).generate('Extrait.'),
    ).rejects.toBeInstanceOf(CardGenerationError);
    expect(p.complete).toHaveBeenCalledTimes(2);
  });

  it('rejette une structure de cartes non conforme', async () => {
    const bad = JSON.stringify({ cards: [{ front: 'x' }] }); // back manquant, front trop court
    await expect(
      new CardGenerator(provider([bad, bad]), { maxAttempts: 2 }).generate('Extrait.'),
    ).rejects.toBeInstanceOf(CardGenerationError);
  });

  it('déduplique les cartes dont la question est équivalente', async () => {
    const dup = JSON.stringify({
      cards: [
        { front: 'Qu\'est-ce que le rappel actif ?', back: 'A' },
        { front: '  qu’est-ce que le RAPPEL actif ?  ', back: 'B' },
        { front: 'Autre question ?', back: 'C' },
      ],
    });

    const cards = await new CardGenerator(provider([dup])).generate('Extrait.');

    expect(cards).toHaveLength(2);
  });

  it('borne le nombre de cartes par section', async () => {
    const many = JSON.stringify({
      cards: Array.from({ length: 12 }, (_v, i) => ({
        front: `Question distincte numéro ${String(i)} ?`,
        back: `Réponse ${String(i)}.`,
      })),
    });

    const cards = await new CardGenerator(provider([many]), { maxCardsPerSection: 5 }).generate('E.');

    expect(cards).toHaveLength(5);
  });
});
