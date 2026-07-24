/**
 * Contrat HTTP du **catalogue**, vu du navigateur.
 *
 * Miroir de `DomainOverview` de l'API (`get-domains.ts`). Dupliqué volontairement :
 * le front ne dépend pas du code du Worker.
 */

/** Un domaine du catalogue, avec la progression de l'apprenant. */
export interface DomainOverview {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Nom de l'icône lucide-react (cf. `icon-map.ts`). */
  readonly icon: string;
  /** Jeton de couleur d'accent (cf. `domain-colors.ts`). */
  readonly color: string;
  readonly order: number;
  readonly lessonsCompleted: number;
  readonly lessonsTotal: number;
  /** Cartes de ce domaine dues maintenant. */
  readonly cardsDue: number;
}

export interface DomainList {
  readonly domains: readonly DomainOverview[];
}

/** Un domaine a-t-il du contenu jouable (au moins une leçon) ? */
export function hasContent(domain: DomainOverview): boolean {
  return domain.lessonsTotal > 0;
}
