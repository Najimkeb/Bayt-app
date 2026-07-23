import type { ReactElement } from 'react';

import type { PathUnit } from '@/lib/api/path-types';

import { LessonNode } from './lesson-node';

/** Fond du bandeau d'unité selon sa couleur. */
const BANNER_BG: Record<string, string> = {
  green: 'var(--color-feather-green)',
  blue: 'var(--color-macaw)',
  yellow: 'var(--color-bee)',
  purple: '#a560e8',
};

/** Amplitude horizontale du serpentin (px). */
const AMP = 52;

/** Décalage horizontal d'un nœud : centre / droite / centre / gauche. */
function offsetFor(index: number): number {
  return [0, AMP, 0, -AMP][index % 4] ?? 0;
}

/**
 * Une unité du chemin : un bandeau titre coloré, puis ses leçons en nœuds
 * disposés en serpentin vertical (alternance centre / droite / gauche), reliés
 * par une colonne centrale.
 */
export function UnitPath({ unit }: { unit: PathUnit }): ReactElement {
  const bg = BANNER_BG[unit.color] ?? BANNER_BG.green;

  return (
    <section aria-label={`Unité : ${unit.title}`} className="flex flex-col gap-6">
      <div
        className="rounded-[var(--radius-card)] px-5 py-4 text-center text-lg font-black text-white shadow-[0_4px_0_rgba(0,0,0,0.15)]"
        style={{ backgroundColor: bg }}
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
              <LessonNode node={node} color={unit.color} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
