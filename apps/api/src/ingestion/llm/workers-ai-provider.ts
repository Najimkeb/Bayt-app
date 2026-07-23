import type { LLMCompletion, LLMProvider } from './provider.js';

/** Réponse minimale attendue de Workers AI (chat). */
interface WorkersAiResponse {
  readonly response?: string;
}

/** Sous-ensemble du binding Workers AI utilisé ici. */
export interface WorkersAiBinding {
  run(model: string, input: unknown): Promise<unknown>;
}

/**
 * Fournisseur Workers AI — premier fournisseur implémenté.
 *
 * Aucune clé externe : le modèle tourne sur l'infrastructure Cloudflare via le
 * binding `AI`. Le modèle est configurable (défaut : Llama 3.1 8B instruct).
 */
export class WorkersAiProvider implements LLMProvider {
  public constructor(
    private readonly ai: WorkersAiBinding,
    private readonly model = '@cf/meta/llama-3.1-8b-instruct',
  ) {}

  public async complete({ system, user }: LLMCompletion): Promise<string> {
    const result = await this.ai.run(this.model, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    if (typeof result === 'string') {
      return result;
    }

    return (result as WorkersAiResponse).response ?? '';
  }
}
