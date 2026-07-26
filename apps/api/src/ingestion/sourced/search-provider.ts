/**
 * Abstraction **provider-agnostique de la recherche web** pour le grounding.
 *
 * Retenu : Cloudflare AI Gateway → outil `web_search` d'un modèle (Anthropic).
 * L'interface reste neutre : brancher un autre moteur = une seule implémentation
 * (cf. `ai-gateway-search.provider.ts`), sans toucher au reste du pipeline.
 */

/** Niveau visé de la leçon. */
export type LessonLevel = 'beginner' | 'intermediate' | 'advanced';

/** Un document source récupéré par la recherche : URL, titre, extrait de texte. */
export interface SearchDocument {
  readonly url: string;
  readonly title: string;
  /** Contenu/extrait pertinent récupéré (base du grounding). */
  readonly content: string;
}

export interface WebSearchProvider {
  /**
   * Recherche le sujet et renvoie des documents sources réels.
   *
   * Doit **privilégier les sources officielles/institutionnelles** quand elles
   * apparaissent. Renvoie `[]` si rien de pertinent (l'appelant échoue alors
   * proprement plutôt que de générer sans source).
   */
  search(topic: string, level: LessonLevel): Promise<readonly SearchDocument[]>;
}
