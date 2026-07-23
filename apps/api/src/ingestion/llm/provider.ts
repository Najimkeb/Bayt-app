/**
 * Abstraction provider-agnostique du LLM.
 *
 * Permet de brancher Claude, OpenAI ou Workers AI derrière la même interface.
 * L'agent « Générateur de cartes » ne dépend que de ce contrat — il ignore quel
 * fournisseur répond.
 */
export interface LLMCompletion {
  /** Consigne système (rôle, format de sortie attendu). */
  readonly system: string;
  /** Contenu utilisateur (le texte source à transformer). */
  readonly user: string;
  /**
   * JSON Schema de la sortie attendue (JSON Mode).
   *
   * Optionnel et provider-agnostique : un fournisseur qui le supporte contraint
   * la sortie à ce schéma (Workers AI `response_format`, structured outputs
   * OpenAI…) ; les autres l'ignorent sans casser. Ne dispense jamais de valider
   * la sortie : Cloudflare ne garantit pas la conformité.
   */
  readonly schema?: Record<string, unknown>;
}

export interface LLMProvider {
  /** Renvoie la réponse brute du modèle (texte, potentiellement du JSON). */
  complete(input: LLMCompletion): Promise<string>;
}
