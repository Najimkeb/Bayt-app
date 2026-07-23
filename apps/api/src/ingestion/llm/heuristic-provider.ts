import type { LLMCompletion, LLMProvider } from './provider.js';

/**
 * Fournisseur local sans réseau — filet de secours pour le développement.
 *
 * Quand aucun binding IA n'est disponible (wrangler dev sans compte Cloudflare),
 * ce fournisseur produit des cartes déterministes à partir du texte, au **même
 * format JSON** que les vrais LLM : le pipeline tourne alors de bout en bout,
 * hors ligne. La qualité est volontairement modeste — c'est un substitut de dev,
 * pas l'agent de production.
 */
export class HeuristicProvider implements LLMProvider {
  public constructor(private readonly maxCards = 6) {}

  public complete({ user }: LLMCompletion): Promise<string> {
    // L'agent encadre l'extrait par des guillemets triples ; on ne génère qu'à
    // partir de ce contenu, pas des consignes du prompt.
    const delimited = /"""\s*([\s\S]*?)\s*"""/.exec(user);
    const source = delimited?.[1] ?? user;

    const sentences = source
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?…])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= 30);

    const cards = sentences.slice(0, this.maxCards).map((sentence) => {
      const words = sentence.split(' ');
      const cue = words.slice(0, 6).join(' ');

      return {
        front: `Complète et explique : « ${cue}… »`,
        back: sentence.slice(0, 300),
      };
    });

    return Promise.resolve(JSON.stringify({ cards }));
  }
}
