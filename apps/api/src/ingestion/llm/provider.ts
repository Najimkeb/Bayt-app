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
}

export interface LLMProvider {
  /** Renvoie la réponse brute du modèle (texte, potentiellement du JSON). */
  complete(input: LLMCompletion): Promise<string>;
}
