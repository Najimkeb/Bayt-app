import { CardParseError, parseCards, type GeneratedCard } from './card-schema.js';
import { dedupeCards } from './dedup.js';
import type { LLMProvider } from './llm/provider.js';

/**
 * Agent « Générateur de cartes ».
 *
 * Construit le prompt, appelle le fournisseur, valide strictement le JLLM,
 * **retente** en cas de sortie invalide, puis échoue proprement. Déduplique le
 * résultat. Ne connaît aucun fournisseur en particulier (cf. `LLMProvider`).
 */

/** Consigne système : des cartes de qualité, une idée par carte. */
const SYSTEM_PROMPT = [
  "Tu es un concepteur pédagogique expert en mémorisation. À partir d'un extrait,",
  'tu produis des flashcards de haute qualité en français.',
  'Règles STRICTES :',
  '- une seule idée par carte ;',
  "- la question (front) force le rappel actif : elle interroge, ne se contente pas d'un intitulé ;",
  '- la réponse (back) est concise et exacte ;',
  "- pas de carte triviale ni de simple paraphrase de l'énoncé ;",
  '- réponds UNIQUEMENT par du JSON valide, sans texte autour, au format :',
  '{"cards":[{"front":"...","back":"..."}]}',
].join('\n');

function buildUser(section: string, maxCards: number): string {
  return [
    `Génère au maximum ${String(maxCards)} flashcards à partir de cet extrait.`,
    'Extrait :',
    '"""',
    section,
    '"""',
  ].join('\n');
}

/** Erreur : l'agent n'a pas produit de cartes valides après plusieurs essais. */
export class CardGenerationError extends Error {
  public override readonly name = 'CardGenerationError';
}

export interface CardGeneratorOptions {
  /** Cartes maximum par section. */
  readonly maxCardsPerSection?: number;
  /** Nombre de tentatives avant d'échouer. */
  readonly maxAttempts?: number;
}

export class CardGenerator {
  readonly #provider: LLMProvider;
  readonly #maxCards: number;
  readonly #maxAttempts: number;

  public constructor(provider: LLMProvider, options: CardGeneratorOptions = {}) {
    this.#provider = provider;
    this.#maxCards = options.maxCardsPerSection ?? 8;
    this.#maxAttempts = options.maxAttempts ?? 2;
  }

  /**
   * Produit des cartes validées et dédupliquées pour une section.
   *
   * Retente si la sortie est invalide ; lève `CardGenerationError` après le
   * dernier essai raté.
   */
  public async generate(section: string): Promise<GeneratedCard[]> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.#maxAttempts; attempt += 1) {
      let raw: string;

      try {
        raw = await this.#provider.complete({
          system: SYSTEM_PROMPT,
          user: buildUser(section, this.#maxCards),
        });
      } catch (error) {
        // Erreur du fournisseur (réseau, quota) : on retente puis on échoue.
        lastError = error;
        continue;
      }

      try {
        return dedupeCards(parseCards(raw)).slice(0, this.#maxCards);
      } catch (error) {
        if (error instanceof CardParseError) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw new CardGenerationError(
      `Échec de génération après ${String(this.#maxAttempts)} tentative(s) : ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }
}
