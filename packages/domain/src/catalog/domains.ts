import type { Domain } from './types.js';

/**
 * Catalogue de domaines de BAYT (structure, **vide de contenu**).
 *
 * Source canonique de la liste : reprise à l'identique par la migration D1
 * (`domains`). Chaque domaine a un identifiant stable, une couleur d'accent et
 * un rang d'affichage. « Apprendre à apprendre » (rang 0) reçoit l'existant.
 */
export const CATALOG_DOMAINS: readonly Domain[] = [
  {
    id: 'dom_apprendre',
    name: 'Apprendre à apprendre',
    description: 'Mémoire, méthodes de travail et concentration.',
    emoji: '🧠',
    color: 'green',
    order: 0,
  },
  {
    id: 'dom_comm',
    name: 'Communication & marketing digital',
    description: 'Contenus, réseaux sociaux et audience.',
    emoji: '📣',
    color: 'blue',
    order: 1,
  },
  {
    id: 'dom_business',
    name: 'Business & entrepreneuriat',
    description: 'Lancer, piloter et faire grandir un projet.',
    emoji: '🚀',
    color: 'purple',
    order: 2,
  },
  {
    id: 'dom_analyst',
    name: 'Business analyst',
    description: 'Besoins, données et aide à la décision.',
    emoji: '📊',
    color: 'teal',
    order: 3,
  },
  {
    id: 'dom_economie',
    name: 'Économie',
    description: 'Marchés, monnaie et politiques économiques.',
    emoji: '💶',
    color: 'yellow',
    order: 4,
  },
  {
    id: 'dom_maths',
    name: 'Mathématiques',
    description: 'Logique, calcul et raisonnement.',
    emoji: '➗',
    color: 'red',
    order: 5,
  },
  {
    id: 'dom_a11y',
    name: 'Accessibilité numérique',
    description: 'Des produits utilisables par toutes et tous.',
    emoji: '♿',
    color: 'indigo',
    order: 6,
  },
  {
    id: 'dom_rgpd',
    name: 'RGPD & protection des données',
    description: 'Vie privée, consentement et conformité.',
    emoji: '🔒',
    color: 'orange',
    order: 7,
  },
  {
    id: 'dom_francais',
    name: 'Français',
    description: 'Langue, expression et style.',
    emoji: '📚',
    color: 'pink',
    order: 8,
  },
  {
    id: 'dom_anglais',
    name: 'Anglais',
    description: 'Comprendre et se faire comprendre.',
    emoji: '🇬🇧',
    color: 'blue',
    order: 9,
  },
  {
    id: 'dom_arabe',
    name: 'Arabe',
    description: 'Lire, écrire et parler.',
    emoji: '🇸🇦',
    color: 'green',
    order: 10,
  },
];
