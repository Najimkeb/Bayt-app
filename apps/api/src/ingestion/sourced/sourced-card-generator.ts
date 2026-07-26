import type { LLMProvider } from '../llm/provider.js';
import {
  SOURCED_CARDS_JSON_SCHEMA,
  SourcedCardParseError,
  parseSourcedCards,
  type SourcedCard,
} from './sourced-card-schema.js';
import type { LessonLevel, SearchDocument } from './search-provider.js';

/**
 * Agent « Générateur de cartes sourcées ».
 *
 * Génère des cartes **uniquement** à partir des documents récupérés par la
 * recherche web — jamais depuis ses connaissances internes. Chaque carte doit
 * citer l'URL d'une source fournie et un extrait verbatim qui la soutient.
 */

const LEVEL_LABEL: Record<LessonLevel, string> = {
  beginner: 'débutant',
  intermediate: 'intermédiaire',
  advanced: 'avancé',
};

/** Consigne système — garde-fous anti-hallucination **obligatoires**. */
const SYSTEM_PROMPT = [
  'Tu es un concepteur pédagogique rigoureux. Tu produis des flashcards en français',
  'À PARTIR EXCLUSIVEMENT des sources fournies. Tu NE complètes JAMAIS avec tes',
  'connaissances internes.',
  'Règles STRICTES :',
  '- une seule idée par carte ; la question (front) force le rappel actif ;',
  '- reste strictement factuel et fidèle aux sources ;',
  "- INTERDICTION d'inventer un chiffre, une date, un nom propre ou une référence.",
  "  Si un fait n'est pas certain d'après les sources, écris « [À VÉRIFIER] » dans la",
  '  réponse en précisant brièvement la raison ;',
  '- chaque carte DOIT porter :',
  "  • sourceUrl : l'URL EXACTE de la source utilisée (parmi celles fournies) ;",
  '  • sourceExtract : un extrait VERBATIM de cette source qui soutient la carte ;',
  '- ne fabrique jamais une URL ou un extrait : recopie-les depuis les sources.',
  'Réponds UNIQUEMENT par du JSON valide, sans texte autour :',
  '{"cards":[{"front":"...","back":"...","sourceUrl":"...","sourceExtract":"..."}]}',
].join('\n');

function buildUser(docs: readonly SearchDocument[], level: LessonLevel, maxCards: number): string {
  const sources = docs
    .map((doc, i) => `SOURCE ${String(i + 1)} — ${doc.title}\nURL: ${doc.url}\n"""\n${doc.content}\n"""`)
    .join('\n\n');

  return [
    `Niveau visé : ${LEVEL_LABEL[level]}.`,
    `Génère au maximum ${String(maxCards)} flashcards, chacune adossée à une source ci-dessous.`,
    'Sources :',
    sources,
  ].join('\n');
}

/** Erreur : aucune carte sourcée valide après les tentatives. */
export class SourcedGenerationError extends Error {
  public override readonly name = 'SourcedGenerationError';
}

export class SourcedCardGenerator {
  public constructor(
    private readonly provider: LLMProvider,
    private readonly maxCards = 12,
    private readonly maxAttempts = 2,
  ) {}

  /**
   * Produit des cartes validées et groundées. Retente si la sortie est invalide,
   * puis lève `SourcedGenerationError`. Déduplique par question.
   */
  public async generate(
    docs: readonly SearchDocument[],
    level: LessonLevel,
  ): Promise<SourcedCard[]> {
    if (docs.length === 0) {
      throw new SourcedGenerationError('Aucune source à exploiter');
    }

    const allowedUrls = new Set(docs.map((doc) => doc.url));
    const user = buildUser(docs, level, this.maxCards);

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const raw = await this.provider.complete({
          system: SYSTEM_PROMPT,
          user,
          schema: SOURCED_CARDS_JSON_SCHEMA,
        });
        const cards = parseSourcedCards(raw, allowedUrls);
        const deduped = dedupeByFront(cards);
        if (deduped.length > 0) {
          return deduped.slice(0, this.maxCards);
        }
        lastError = new SourcedGenerationError('Aucune carte adossée à une source');
      } catch (error) {
        lastError = error;
        if (!(error instanceof SourcedCardParseError)) {
          throw error;
        }
        console.warn(`[sourced] sortie invalide (tentative ${String(attempt)}/${String(this.maxAttempts)})`);
      }
    }

    throw new SourcedGenerationError(
      lastError instanceof Error ? lastError.message : 'Génération sourcée impossible',
    );
  }
}

/** Retire les doublons de question (comparaison insensible casse/espaces). */
function dedupeByFront(cards: readonly SourcedCard[]): SourcedCard[] {
  const seen = new Set<string>();
  const out: SourcedCard[] = [];
  for (const card of cards) {
    const key = card.front.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(card);
    }
  }

  return out;
}
