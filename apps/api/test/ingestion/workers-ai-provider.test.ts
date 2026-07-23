import { describe, expect, it, vi } from 'vitest';

import { CARDS_JSON_SCHEMA } from '../../src/ingestion/card-schema.js';
import {
  DEFAULT_WORKERS_AI_MODEL,
  WorkersAiProvider,
  type WorkersAiBinding,
} from '../../src/ingestion/llm/workers-ai-provider.js';

/** Binding factice : capture l'appel et renvoie une réponse scriptée. */
function binding(response: unknown): WorkersAiBinding {
  return { run: vi.fn(() => Promise.resolve(response)) };
}

describe('WorkersAiProvider', () => {
  it('active le JSON Mode (response_format json_schema) quand un schéma est fourni', async () => {
    const ai = binding({ response: '{"cards":[]}' });
    await new WorkersAiProvider(ai).complete({
      system: 's',
      user: 'u',
      schema: CARDS_JSON_SCHEMA,
    });

    const [model, input] = (ai.run as ReturnType<typeof vi.fn>).mock.calls[0] as [string, any];
    expect(model).toBe(DEFAULT_WORKERS_AI_MODEL);
    expect(input.response_format).toEqual({
      type: 'json_schema',
      json_schema: CARDS_JSON_SCHEMA,
    });
    expect(input.max_tokens).toBeGreaterThanOrEqual(1024);
  });

  it("n'ajoute pas response_format sans schéma", async () => {
    const ai = binding({ response: 'texte' });
    await new WorkersAiProvider(ai).complete({ system: 's', user: 'u' });

    const [, input] = (ai.run as ReturnType<typeof vi.fn>).mock.calls[0] as [string, any];
    expect(input.response_format).toBeUndefined();
  });

  it('tolère une réponse déjà structurée (objet) en la re-sérialisant', async () => {
    const ai = binding({ response: { cards: [{ front: 'F', back: 'B' }] } });
    const raw = await new WorkersAiProvider(ai).complete({ system: 's', user: 'u' });

    expect(JSON.parse(raw)).toEqual({ cards: [{ front: 'F', back: 'B' }] });
  });

  it('renvoie la chaîne de réponse quand elle est textuelle', async () => {
    const ai = binding({ response: '{"cards":[]}' });
    const raw = await new WorkersAiProvider(ai).complete({ system: 's', user: 'u' });

    expect(raw).toBe('{"cards":[]}');
  });
});
