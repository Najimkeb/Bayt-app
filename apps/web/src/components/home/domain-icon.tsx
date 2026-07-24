import type { CSSProperties, ReactElement } from 'react';

import { paletteFor } from '@/lib/domain-colors';
import { iconFor } from '@/lib/icon-map';

/** Tailles disponibles (pastille / icône). */
const SIZES = {
  sm: { pill: 'size-9', icon: 'size-[18px]' },
  md: { pill: 'size-11', icon: 'size-[22px]' },
  lg: { pill: 'size-12', icon: 'size-6' },
} as const;

/**
 * Icône vectorielle d'un domaine (ou d'une carte), dans une **pastille ronde**
 * à sa couleur d'accent : fond en teinte claire (accent translucide), trait de
 * l'icône en teinte soutenue. Cohérent en Dark et Light (le fond translucide se
 * pose sur la surface courante).
 *
 * Purement décorative : `aria-hidden`, l'information reste portée par le texte
 * voisin (WCAG 1.1.1).
 */
export function DomainIcon({
  name,
  color,
  size = 'md',
}: {
  /** Nom lucide-react (cf. `icon-map`). */
  name: string;
  /** Jeton de couleur d'accent du domaine. */
  color: string;
  size?: keyof typeof SIZES;
}): ReactElement {
  const Icon = iconFor(name);
  const { fill } = paletteFor(color);
  const dims = SIZES[size];

  // Fond = accent à ~13 % ; trait = accent plein. Variables inline car la
  // couleur est dynamique (jeton de domaine, hors palette Tailwind statique).
  const style = { backgroundColor: `${fill}22`, color: fill } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`grid ${dims.pill} shrink-0 place-items-center rounded-full`}
    >
      <Icon className={dims.icon} strokeWidth={2.5} />
    </span>
  );
}
