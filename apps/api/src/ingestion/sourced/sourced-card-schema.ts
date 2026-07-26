import { z } from 'zod';

import { extractJson } from '../card-schema.js';

/**
 * Contrat d'une carte **sourcée** : chaque carte porte son extrait source exact
 * et l'URL de la source. **Garde-fou anti-hallucination** : une carte sans
 * extrait ni URL est rejetée par ce schéma (champs obligatoires, non vides).
 */
export const sourcedCardSchema = z.object({
  front: z.string().trim().min(3).max(300),
  back: z.string().trim().min(1).max(600),
  /** URL exacte de la source (doit venir des documents fournis). */
  sourceUrl: z.string().trim().url().max(2000),
  /** Extrait verbatim qui soutient la carte (grounding). */
  sourceExtract: z.string().trim().min(10).max(1200),
});

export const sourcedCardsSchema = z.object({
  cards: z.array(sourcedCardSchema).max(30),
});

export type SourcedCard = z.infer<typeof sourcedCardSchema>;

/** JSON Schema (JSON Mode) — miroir du contrat, la validation zod reste juge. */
export const SOURCED_CARDS_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          front: { type: 'string' },
          back: { type: 'string' },
          sourceUrl: { type: 'string' },
          sourceExtract: { type: 'string' },
        },
        required: ['front', 'back', 'sourceUrl', 'sourceExtract'],
      },
    },
  },
  required: ['cards'],
};

/** Erreur : la sortie n'est pas un JSON de cartes sourcées valide. */
export class SourcedCardParseError extends Error {
  public override readonly name = 'SourcedCardParseError';
}

/**
 * Analyse et valide la sortie. **Filtre en plus** les cartes dont l'URL ne
 * figure pas dans les sources autorisées : une carte ne peut pas citer une URL
 * qui n'a pas été récupérée par la recherche (anti-fabrication de source).
 */
export function parseSourcedCards(raw: string, allowedUrls: ReadonlySet<string>): SourcedCard[] {
  let json: unknown;
  try {
    json = JSON.parse(extractJson(raw));
  } catch {
    throw new SourcedCardParseError('JSON illisible');
  }

  const result = sourcedCardsSchema.safeParse(json);
  if (!result.success) {
    throw new SourcedCardParseError('Structure de cartes invalide');
  }

  // Ne garde que les cartes réellement adossées à une source récupérée.
  return result.data.cards.filter((card) => allowedUrls.has(card.sourceUrl));
}
