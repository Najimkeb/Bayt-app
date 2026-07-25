'use client';

import { Flame, GraduationCap, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactElement } from 'react';

import type { ProfileStats } from '@/lib/api/profile-types';
import { paletteFor } from '@/lib/domain-colors';

/** Grandes cartes de statistiques, style Duolingo. */
export function StatCards({ stats }: { stats: ProfileStats }): ReactElement {
  const streakUnit = stats.currentStreak > 1 ? 'jours' : 'jour';

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        icon={Flame}
        color="orange"
        value={stats.currentStreak}
        label="Série actuelle"
        hint={`Record : ${String(stats.longestStreak)} ${stats.longestStreak > 1 ? 'jours' : 'jour'}`}
        unit={streakUnit}
      />
      <StatCard icon={Zap} color="yellow" value={stats.xpTotal} label="XP total" />
      <StatCard icon={Sparkles} color="green" value={stats.cardsMastered} label="Cartes maîtrisées" />
      <StatCard
        icon={GraduationCap}
        color="blue"
        value={stats.lessonsCompleted}
        label="Leçons terminées"
      />
    </ul>
  );
}

function StatCard({
  icon: Icon,
  color,
  value,
  label,
  hint,
  unit,
}: {
  icon: LucideIcon;
  color: string;
  value: number;
  label: string;
  hint?: string;
  unit?: string;
}): ReactElement {
  const { fill } = paletteFor(color);
  const pill = { backgroundColor: `${fill}22`, color: fill } as CSSProperties;

  return (
    <li className="flex flex-col gap-2 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
      <span aria-hidden="true" style={pill} className="grid size-9 place-items-center rounded-full">
        <Icon className="size-5" strokeWidth={2.5} />
      </span>
      <p className="text-3xl font-black leading-none tabular-nums">
        {value.toLocaleString('fr-FR')}
        {unit !== undefined && (
          <span className="ml-1 text-sm font-extrabold text-muted-foreground">{unit}</span>
        )}
      </p>
      <p className="text-xs font-extrabold leading-tight text-muted-foreground">{label}</p>
      {hint !== undefined && <p className="text-[0.7rem] font-bold text-muted-foreground">{hint}</p>}
    </li>
  );
}
