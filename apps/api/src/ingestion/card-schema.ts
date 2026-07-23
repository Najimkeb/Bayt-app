import { z } from 'zod';

/**
 * Contrat de sortie de l'agent « Générateur de cartes ».
 *
 * Une carte = une idée : une question qui force le rappel actif, une réponse
 * concise. La sortie du LLM est **strictement** validée par ce schéma.
 */
export const generatedCardSchema = z.object({
  front: z.string().trim().min(3).max(300),
  back: z.string().trim().min(1).max(600),
});

export const generatedCardsSchema = z.object({
  cards: z.array(generatedCardSchema).max(50),
});

export type GeneratedCard = z.infer<typeof generatedCardSchema>;

/**
 * Même contrat, exprimé en **JSON Schema** pour le JSON Mode de Workers AI.
 *
 * Passé à `env.AI.run` via `response_format` : le modèle est alors contraint à
 * produire cette structure exacte (objet `{ cards: [{ front, back }] }`, `front`
 * et `back` obligatoires). Miroir volontaire de `generatedCardsSchema` — la
 * validation zod reste le juge final (Cloudflare ne garantit pas la conformité).
 */
export const CARDS_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          front: { type: 'string' },
          back: { type: 'string' },
        },
        required: ['front', 'back'],
      },
    },
  },
  required: ['cards'],
};

/** Erreur : la sortie du LLM n'est pas un JSON de cartes valide. */
export class CardParseError extends Error {
  public override readonly name = 'CardParseError';
}

/**
 * Isole le JSON dans une réponse de LLM qui peut l'entourer de prose ou de
 * balises Markdown (```json … ```).
 */
export function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced?.[1] !== undefined) {
    return fenced[1].trim();
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    return text.slice(start, end + 1);
  }

  return text.trim();
}

/**
 * Analyse et valide la sortie du LLM. Lève `CardParseError` si le JSON est
 * illisible ou ne respecte pas le schéma.
 */
export function parseCards(raw: string): GeneratedCard[] {
  let json: unknown;

  try {
    json = JSON.parse(extractJson(raw));
  } catch {
    throw new CardParseError('JSON illisible');
  }

  const result = generatedCardsSchema.safeParse(json);
  if (!result.success) {
    throw new CardParseError('Structure de cartes invalide');
  }

  return result.data.cards;
}
