/**
 * Catalogue hiérarchisé : **Domaine → Unité → Leçon**.
 *
 * Structure pure (aucune persistance ici) : les types et les règles qui les
 * gouvernent. Un `Domain` regroupe des `Unit`s ordonnées, chacune regroupant des
 * `Lesson`s ordonnées. Les cartes (`learning_items`) sont rattachées à un domaine
 * pour permettre la révision par domaine.
 */

/** Couleur d'accent d'un domaine (jeton mappé en CSS par l'UI). */
export type DomainColor =
  | 'green'
  | 'blue'
  | 'yellow'
  | 'purple'
  | 'red'
  | 'teal'
  | 'orange'
  | 'pink'
  | 'indigo';

export const DOMAIN_COLORS: readonly DomainColor[] = [
  'green',
  'blue',
  'yellow',
  'purple',
  'red',
  'teal',
  'orange',
  'pink',
  'indigo',
];

/** Un domaine d'apprentissage (racine du catalogue). */
export interface Domain {
  readonly id: string;
  readonly name: string;
  /** Description courte (une phrase). */
  readonly description: string;
  /** Nom de l'icône lucide-react (ex. `Brain`), mappé vers un composant côté UI. */
  readonly icon: string;
  readonly color: DomainColor;
  /** Rang d'affichage dans le sélecteur. */
  readonly order: number;
}

/** Une unité, rattachée à un domaine. */
export interface CatalogUnit {
  readonly id: string;
  readonly domainId: string;
  readonly title: string;
  readonly order: number;
}

/** Une leçon, rattachée à une unité (structure de leçon existante conservée). */
export interface CatalogLesson {
  readonly id: string;
  readonly unitId: string;
  readonly title: string;
  readonly order: number;
}
