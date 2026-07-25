'use client';

import { useState, type CSSProperties, type ReactElement } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';
import { useSetDailyGoal } from '@/lib/api/profile-queries';
import { useUserId } from '@/lib/auth/use-user-id';
import { paletteFor } from '@/lib/domain-colors';

/** Cibles d'XP/jour proposées (bornées côté serveur : 10 à 1000). */
const PRESETS: readonly { readonly label: string; readonly value: number }[] = [
  { label: 'Décontracté', value: 20 },
  { label: 'Régulier', value: 50 },
  { label: 'Sérieux', value: 100 },
  { label: 'Intense', value: 150 },
];

const GREEN = paletteFor('green').fill;

/** Réglages : objectif quotidien (cible d'XP) et préférence de thème. */
export function SettingsPanel({ dailyGoal }: { dailyGoal: number }): ReactElement {
  const userId = useUserId();
  const setGoal = useSetDailyGoal(userId);
  const [selected, setSelected] = useState(dailyGoal);

  function choose(value: number): void {
    setSelected(value);
    setGoal.mutate(value);
  }

  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-card)] border-2 border-border bg-surface p-5">
      <fieldset className="flex flex-col gap-3" disabled={setGoal.isPending}>
        <legend className="text-sm font-extrabold">Objectif quotidien</legend>
        <p className="text-xs font-bold text-muted-foreground">
          Choisis ta cible d&apos;XP par jour. Elle règle ta série — jamais ta mémoire.
        </p>
        <div role="radiogroup" aria-label="Objectif quotidien en XP" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((preset) => {
            const active = selected === preset.value;

            return (
              <button
                key={preset.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(preset.value)}
                style={active ? ({ borderColor: GREEN, backgroundColor: `${GREEN}1a` } as CSSProperties) : undefined}
                className={[
                  'flex flex-col items-center gap-0.5 rounded-[var(--radius-card)] border-2 px-3 py-2.5',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'disabled:opacity-60',
                  active ? 'font-black' : 'border-border hover:bg-surface-hover',
                ].join(' ')}
              >
                <span className="text-lg font-black tabular-nums">{preset.value}</span>
                <span className="text-[0.7rem] font-bold text-muted-foreground">{preset.label}</span>
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="text-xs font-bold text-muted-foreground">
          {setGoal.isPending
            ? 'Enregistrement…'
            : setGoal.isError
              ? 'Impossible d’enregistrer l’objectif. Réessaie.'
              : `Objectif actuel : ${String(selected)} XP par jour.`}
        </p>
      </fieldset>

      <div className="flex items-center justify-between gap-3 border-t-2 border-border pt-4">
        <div className="flex flex-col">
          <p className="text-sm font-extrabold">Thème</p>
          <p className="text-xs font-bold text-muted-foreground">Clair, sombre — ou selon ton système.</p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
