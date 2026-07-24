import type { ReactElement } from 'react';

import type { PathUnit } from '@/lib/api/path-types';
import { paletteFor } from '@/lib/domain-colors';

import { LessonNode } from './lesson-node';

/** Amplitude horizontale du serpentin (px). */
const AMP = 52;

/** Décalage horizontal d'un nœud : centre / droite / centre / gauche. */
function offsetFor(index: number): number {
  return [0, AMP, 0, -AMP][index % 4] ?? 0;
}

/**
 * Une unité du chemin : un bandeau titre coloré (couleur du domaine), puis ses
 * leçons en nœuds disposés en serpentin vertical (alternance centre / droite /
 * gauche), reliés par une colonne centrale.
 *
 * La couleur ne vient plus de l'unité mais du **domaine** : toutes les unités
 * d'un domaine partagent son accent, gage de cohérence visuelle.
 */
export function UnitPath({ unit, color }: { unit: PathUnit; color: string }): ReactElement {
  const { fill } = paletteFor(color);

  return (
    <section aria-label={`Unité : ${unit.title}`} className="flex flex-col gap-6">
      <div
        className="rounded-[var(--radius-card)] px-5 py-4 text-center text-lg font-black text-white shadow-[0_4px_0_rgba(0,0,0,0.15)]"
        style={{ backgroundColor: fill }}
      >
        {unit.title}
      </div>

      {/* Serpentin : colonne centrale (le « chemin ») + nœuds décalés. */}
      <div className="relative mx-auto w-full max-w-[18rem]">
        <div
          aria-hidden="true"
          className="absolute inset-y-4 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-border"
        />
        <ol className="relative flex flex-col items-center gap-7">
          {unit.lessons.map((node, index) => (
            <li key={node.id} style={{ transform: `translateX(${String(offsetFor(index))}px)` }}>
              <LessonNode node={node} color={color} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
