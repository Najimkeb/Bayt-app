import { normalizeText } from '@bayt/domain';

import type { GeneratedCard } from './card-schema.js';

/**
 * Anti-doublon basique : deux cartes dont la question est identique une fois
 * normalisée (accents, casse, ponctuation, espaces) sont considérées comme un
 * doublon. On garde la première.
 *
 * Réutilise `normalizeText` du domaine — la même normalisation que la
 * correction des exercices.
 */
export function dedupeCards(cards: readonly GeneratedCard[]): GeneratedCard[] {
  const seen = new Set<string>();
  const unique: GeneratedCard[] = [];

  for (const card of cards) {
    const key = normalizeText(card.front);
    if (key === '' || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(card);
  }

  return unique;
}
