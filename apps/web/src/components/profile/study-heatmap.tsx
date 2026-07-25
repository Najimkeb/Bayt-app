'use client';

import type { CSSProperties, ReactElement } from 'react';

import type { HeatmapCell, ProfileActivity } from '@/lib/api/profile-types';
import { paletteFor } from '@/lib/domain-colors';

const GREEN = paletteFor('green').fill;

/** Niveau d'intensité (0 à 4) selon le nombre de révisions du jour. */
function level(count: number): number {
  if (count === 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 12) return 3;

  return 4;
}

/** Couleur d'une case selon son intensité (dégradé de vert sur la surface). */
function cellStyle(count: number): CSSProperties {
  const l = level(count);
  if (l === 0) {
    return { backgroundColor: 'var(--color-surface-hover)' };
  }

  return { backgroundColor: GREEN, opacity: 0.25 + l * 0.185 };
}

/** Ligne de grille (lun→dim) d'un jour `YYYY-MM-DD`. */
function weekdayRow(day: string): number {
  const d = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = dimanche

  return ((d + 6) % 7) + 1; // 1 = lundi … 7 = dimanche
}

/**
 * Calendrier d'assiduité type « heatmap » : chaque case est un jour, sa couleur
 * dit l'intensité d'étude. Rend la série visible d'un coup d'œil.
 *
 * Accessibilité : la grille est décorative (`aria-hidden`) et doublée d'un
 * **résumé textuel** ; chaque case porte un `title` pour la souris.
 */
export function StudyHeatmap({ activity }: { activity: ProfileActivity }): ReactElement {
  const cells = activity.heatmap;
  const first = cells[0];

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
      <p className="text-sm font-bold text-muted-foreground">
        <span className="font-black text-foreground">{activity.distinctStudyDays}</span> jour
        {activity.distinctStudyDays > 1 ? 's' : ''} d&apos;étude sur les {cells.length} derniers.
      </p>

      <div
        aria-hidden="true"
        className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto"
        style={{ gridAutoColumns: 'minmax(0.75rem, 1fr)' }}
      >
        {cells.map((cell, index) => (
          <span
            key={cell.day}
            title={`${cell.day} · ${String(cell.count)} révision${cell.count > 1 ? 's' : ''}`}
            className="aspect-square rounded-[3px]"
            style={{
              ...cellStyle(cell.count),
              // Aligne la première case sur son jour de semaine (le reste suit).
              ...(index === 0 && first !== undefined
                ? { gridRowStart: weekdayRow(first.day) }
                : {}),
            }}
          />
        ))}
      </div>

      <Legend />
      <HeatmapSummary cells={cells} />
    </div>
  );
}

/** Légende « moins → plus », cohérente avec le dégradé. */
function Legend(): ReactElement {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-1.5 self-end text-[0.7rem] font-bold text-muted-foreground"
    >
      <span>Moins</span>
      {[0, 1, 2, 3, 4].map((l) => (
        <span
          key={l}
          className="size-3 rounded-[3px]"
          style={l === 0 ? { backgroundColor: 'var(--color-surface-hover)' } : { backgroundColor: GREEN, opacity: 0.25 + l * 0.185 }}
        />
      ))}
      <span>Plus</span>
    </div>
  );
}

/** Alternative textuelle : les jours étudiés (masqué visuellement). */
function HeatmapSummary({ cells }: { cells: readonly HeatmapCell[] }): ReactElement {
  const active = cells.filter((cell) => cell.count > 0);

  return (
    <table className="sr-only">
      <caption>Jours d&apos;étude sur les {cells.length} derniers jours</caption>
      <thead>
        <tr>
          <th scope="col">Jour</th>
          <th scope="col">Révisions</th>
        </tr>
      </thead>
      <tbody>
        {active.map((cell) => (
          <tr key={cell.day}>
            <td>{cell.day}</td>
            <td>{cell.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
