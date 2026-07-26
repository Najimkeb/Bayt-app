import type { LessonLevel, SearchDocument, WebSearchProvider } from './search-provider.js';

/**
 * Provider de recherche **factice** — pour les tests et le dev hors ligne.
 *
 * Renvoie des documents pré-définis (jamais du vrai web). Ne remplace pas la
 * recherche de production ; il rend le reste du pipeline (génération, audit,
 * relecture) testable et démontrable sans clé ni réseau.
 */
export class FakeWebSearchProvider implements WebSearchProvider {
  public constructor(private readonly docs: readonly SearchDocument[] = []) {}

  public search(_topic: string, _level: LessonLevel): Promise<readonly SearchDocument[]> {
    return Promise.resolve(this.docs);
  }
}
