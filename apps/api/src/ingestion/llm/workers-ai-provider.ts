import type { LLMCompletion, LLMProvider } from './provider.js';

/**
 * Réponse minimale attendue de Workers AI (chat).
 *
 * `response` peut être une **chaîne** (le texte du modèle) ou un **objet** déjà
 * structuré : selon le modèle et l'activation du mode JSON, Workers AI renvoie
 * l'un ou l'autre. On tolère les deux.
 */
interface WorkersAiResponse {
  readonly response?: string | Record<string, unknown> | null;
}

/** Sous-ensemble du binding Workers AI utilisé ici. */
export interface WorkersAiBinding {
  run(model: string, input: unknown): Promise<unknown>;
}

/**
 * Modèle Workers AI par défaut de l'agent « Générateur de cartes ».
 *
 * Choix : **Llama 3.3 70B (fp8-fast)**. Générer des flashcards de qualité exige
 * de suivre des consignes strictes (une idée par carte, rappel actif, réponse
 * JSON pure). Le 70B tient nettement mieux ces consignes et le format JSON que
 * le 8B — moins de sorties invalides, donc moins de retries et de rejets. La
 * variante `fp8-fast` garde la latence et le coût raisonnables ; l'ingestion
 * étant asynchrone (hors chemin critique) et bornée (40 cartes/doc), on peut
 * s'offrir la qualité. Surchargeable par le 2ᵉ argument du constructeur.
 */
export const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/**
 * Fournisseur Workers AI — premier fournisseur implémenté.
 *
 * Aucune clé externe : le modèle tourne sur l'infrastructure Cloudflare via le
 * binding `AI`. `model` est exposé (lecture seule) pour être journalisé au
 * démarrage de l'ingestion.
 */
export class WorkersAiProvider implements LLMProvider {
  public constructor(
    private readonly ai: WorkersAiBinding,
    public readonly model: string = DEFAULT_WORKERS_AI_MODEL,
  ) {}

  public async complete({ system, user, schema }: LLMCompletion): Promise<string> {
    const result = await this.ai.run(this.model, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      // Sans plafond explicite, Workers AI tronque la réponse (~256 tokens) et
      // coupe le JSON en plein milieu → sortie invalide. Un plafond large laisse
      // tenir le tableau complet de cartes (borné en amont à 6/section).
      max_tokens: 2048,
      // JSON Mode : contraint la sortie au schéma fourni. Le modèle par défaut
      // (Llama 3.3 70B fp8-fast) figure dans la liste Workers AI supportant
      // `response_format`. Format Cloudflare : le schéma va directement dans
      // `json_schema` (pas d'enveloppe `{ name, schema }`).
      ...(schema === undefined
        ? {}
        : { response_format: { type: 'json_schema', json_schema: schema } }),
    });

    if (typeof result === 'string') {
      return result;
    }

    const resp = (result as WorkersAiResponse).response;
    if (typeof resp === 'string') {
      return resp;
    }
    // `response` déjà structuré (mode JSON) : on le re-sérialise pour que
    // l'agent le valide via le même chemin que du texte JSON brut.
    if (resp !== null && typeof resp === 'object') {
      return JSON.stringify(resp);
    }

    return '';
  }
}
