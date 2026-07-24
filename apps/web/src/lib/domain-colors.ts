/**
 * Palette d'accent des domaines — un seul endroit qui traduit le jeton de
 * couleur (`DomainColor` du domaine) en couleurs concrètes.
 *
 * Les tokens `@theme` de `globals.css` ne couvrent que vert/bleu/jaune ; les
 * domaines en ont neuf. On matérialise donc ici la palette complète (style
 * Duolingo : une teinte pleine + son « ombre » plus foncée pour l'effet 3D),
 * avec un repli sur le vert pour tout jeton inconnu.
 */

export interface DomainPalette {
  /** Teinte pleine du nœud / bandeau. */
  readonly fill: string;
  /** Ombre portée plus foncée (effet pressable 3D). */
  readonly shadow: string;
}

const PALETTE = {
  green: { fill: '#58CC02', shadow: '#46A302' },
  blue: { fill: '#1CB0F6', shadow: '#1899D6' },
  yellow: { fill: '#FFC800', shadow: '#E6A700' },
  purple: { fill: '#A560E8', shadow: '#7D3FC0' },
  red: { fill: '#FF4B4B', shadow: '#D33131' },
  teal: { fill: '#14B8A6', shadow: '#0E8C7F' },
  orange: { fill: '#FF9600', shadow: '#E68200' },
  pink: { fill: '#EC4899', shadow: '#C13584' },
  indigo: { fill: '#6366F1', shadow: '#4F46E5' },
} satisfies Record<string, DomainPalette>;

/** Teinte de repli quand le jeton est inconnu. */
const FALLBACK: DomainPalette = PALETTE.green;

/** Couleurs concrètes d'un jeton de domaine (repli vert si inconnu). */
export function paletteFor(color: string): DomainPalette {
  return (PALETTE as Record<string, DomainPalette>)[color] ?? FALLBACK;
}
