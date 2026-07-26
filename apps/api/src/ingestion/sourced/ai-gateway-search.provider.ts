import { z } from 'zod';

import { extractJson } from '../card-schema.js';
import type { LessonLevel, SearchDocument, WebSearchProvider } from './search-provider.js';

/**
 * Recherche web via **Cloudflare AI Gateway → outil `web_search` d'Anthropic**.
 *
 * On demande à Claude (qui fait la recherche web côté fournisseur) de renvoyer
 * les meilleures sources en JSON : URL + titre + extrait verbatim. AI Gateway
 * apporte journalisation, cache, limitation de débit et garde-fous.
 *
 * **Provider-agnostique** : brancher un autre moteur = une autre implémentation
 * de `WebSearchProvider`, sans toucher au pipeline (cf. `search-provider.ts`).
 * Documenté dans `docs` : basculer un domaine sensible sur un modèle plus
 * rigoureux = changer `model` (ex. `anthropic/claude-opus-…`).
 */
export interface AiGatewaySearchConfig {
  readonly accountId: string;
  readonly gatewayId: string;
  readonly anthropicApiKey: string;
  /** Modèle Anthropic (défaut : un modèle rapide et solide). */
  readonly model?: string;
}

const sourcesSchema = z.object({
  sources: z
    .array(
      z.object({
        url: z.string().trim().url().max(2000),
        title: z.string().trim().min(1).max(300),
        content: z.string().trim().min(10).max(4000),
      }),
    )
    .max(8),
});

/** Bloc de contenu d'une réponse Anthropic (on ne lit que le texte). */
const anthropicSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
});

const LEVEL_LABEL: Record<LessonLevel, string> = {
  beginner: 'débutant',
  intermediate: 'intermédiaire',
  advanced: 'avancé',
};

export class AiGatewayWebSearchProvider implements WebSearchProvider {
  readonly #config: Required<AiGatewaySearchConfig>;

  public constructor(config: AiGatewaySearchConfig) {
    this.#config = { model: 'anthropic/claude-3-5-haiku-latest', ...config };
  }

  public async search(topic: string, level: LessonLevel): Promise<readonly SearchDocument[]> {
    const url = `https://gateway.ai.cloudflare.com/v1/${this.#config.accountId}/${this.#config.gatewayId}/anthropic/v1/messages`;

    const prompt = [
      `Recherche sur le web des informations fiables sur : « ${topic} » (niveau ${LEVEL_LABEL[level]}).`,
      'Privilégie les sources OFFICIELLES ou INSTITUTIONNELLES.',
      'Renvoie UNIQUEMENT du JSON, sans texte autour, avec au plus 6 sources :',
      '{"sources":[{"url":"...","title":"...","content":"extrait verbatim pertinent"}]}',
      "N'invente aucune URL ni aucun extrait : recopie-les depuis les résultats.",
    ].join('\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.#config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.#config.model,
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Recherche web indisponible (HTTP ${String(response.status)})`);
    }

    const body = anthropicSchema.safeParse(await response.json());
    if (!body.success) {
      return [];
    }

    // Concatène les blocs texte (le JSON des sources y figure).
    const text = body.data.content
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text ?? '')
      .join('\n');

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(text));
    } catch {
      return [];
    }

    const sources = sourcesSchema.safeParse(parsed);

    return sources.success ? sources.data.sources : [];
  }
}

/**
 * Fabrique le provider depuis la configuration, ou `null` si non configuré.
 *
 * Non configuré → la route de génération répond « recherche web non
 * configurée » plutôt que de casser (dégradation propre, rien d'autre affecté).
 */
export function createWebSearchProvider(config: {
  accountId?: string | undefined;
  gatewayId?: string | undefined;
  anthropicApiKey?: string | undefined;
  model?: string | undefined;
}): WebSearchProvider | null {
  if (
    config.accountId === undefined ||
    config.gatewayId === undefined ||
    config.anthropicApiKey === undefined ||
    config.accountId === '' ||
    config.gatewayId === '' ||
    config.anthropicApiKey === ''
  ) {
    return null;
  }

  return new AiGatewayWebSearchProvider({
    accountId: config.accountId,
    gatewayId: config.gatewayId,
    anthropicApiKey: config.anthropicApiKey,
    ...(config.model !== undefined && config.model !== '' ? { model: config.model } : {}),
  });
}
