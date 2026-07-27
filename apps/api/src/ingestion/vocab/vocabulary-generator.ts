import type { LLMProvider } from '../llm/provider.js';

import type { FrequencyTranche } from './tranches.js';
import {
  VOCAB_WORDS_JSON_SCHEMA,
  VocabParseError,
  parseVocabWords,
  type VocabWord,
} from './vocab-schema.js';

/**
 * Agent « Générateur de vocabulaire par fréquence ».
 *
 * Produit, pour une tranche de rang de fréquence donnée, les mots anglais les
 * PLUS FRÉQUENTS de l'intervalle, par **paquets raisonnables** (un appel = un
 * paquet). L'appelant enchaîne plusieurs paquets pour couvrir la tranche, en
 * passant à chaque fois la liste des mots déjà obtenus (`exclude`) afin de
 * limiter les répétitions à la source.
 */

/** Consigne système — s'appuie sur les listes de fréquence standard. */
const SYSTEM_PROMPT = [
  'Tu es un lexicographe spécialiste des corpus de fréquence de l’anglais (type COCA, SUBTLEX).',
  'On construit une liste de vocabulaire pour un francophone qui apprend l’anglais par ORDRE',
  "D'UTILITÉ : les mots les plus fréquents d’abord.",
  'Règles STRICTES :',
  '- donne les mots RÉELLEMENT les plus fréquents de l’intervalle de rang demandé,',
  '  par fréquence d’usage décroissante (anglais courant, pas de jargon rare) ;',
  '- un mot par entrée ; forme de base (lemme) ; pas de doublon dans ta réponse ;',
  '- pour chaque mot : traduction française juste, catégorie grammaticale, UNE phrase',
  "  d'exemple simple et naturelle en anglais, et sa traduction française fidèle ;",
  '- n’invente pas de mot ni de sens ; si un doute, choisis le sens le plus courant ;',
  "- n'utilise JAMAIS le tiret cadratin « — » ni le demi-cadratin « – » dans les",
  '  traductions et exemples ; emploie une ponctuation simple (virgule, parenthèses) ;',
  '- NE répète PAS les mots déjà fournis (liste EXCLURE).',
  'Réponds UNIQUEMENT par du JSON valide, sans texte autour :',
  '{"words":[{"word":"...","translation":"...","category":"...","example":"...","exampleTranslation":"..."}]}',
].join('\n');

function buildUser(
  tranche: FrequencyTranche,
  count: number,
  exclude: readonly string[],
): string {
  const lines = [
    `Intervalle de rang de fréquence : ${String(tranche.start)} à ${String(tranche.end)} (anglais).`,
    `Donne les ${String(count)} PROCHAINS mots les plus fréquents de cet intervalle,`,
    'par fréquence décroissante, non encore fournis.',
  ];
  if (exclude.length > 0) {
    lines.push(`EXCLURE (déjà fournis) : ${exclude.join(', ')}.`);
  }

  return lines.join('\n');
}

/** Erreur : sortie de vocabulaire invalide après les tentatives. */
export class VocabGenerationError extends Error {
  public override readonly name = 'VocabGenerationError';
}

export class VocabularyGenerator {
  public constructor(
    private readonly provider: LLMProvider,
    private readonly maxAttempts = 2,
  ) {}

  /**
   * Produit un paquet de mots validés pour la tranche, en excluant ceux déjà
   * obtenus. Retente si la sortie est invalide, puis lève `VocabGenerationError`.
   */
  public async generateBatch(
    tranche: FrequencyTranche,
    count: number,
    exclude: readonly string[],
  ): Promise<VocabWord[]> {
    const user = buildUser(tranche, count, exclude);

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const raw = await this.provider.complete({
          system: SYSTEM_PROMPT,
          user,
          schema: VOCAB_WORDS_JSON_SCHEMA,
        });

        return parseVocabWords(raw);
      } catch (error) {
        lastError = error;
        if (!(error instanceof VocabParseError)) {
          throw error;
        }
        console.warn(`[vocab] sortie invalide (tentative ${String(attempt)}/${String(this.maxAttempts)})`);
      }
    }

    throw new VocabGenerationError(
      lastError instanceof Error ? lastError.message : 'Génération de vocabulaire impossible',
    );
  }
}
