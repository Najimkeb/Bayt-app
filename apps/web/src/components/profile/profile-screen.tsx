'use client';

import { Mascot } from '@bayt/ui';
import type { ReactElement } from 'react';

import { useProfile } from '@/lib/api/profile-queries';
import { useUserId } from '@/lib/auth/use-user-id';

import { ActivityChart } from './activity-chart';
import { DomainProgress } from './domain-progress';
import { MemoryHealthCard } from './memory-health';
import { ProfileHeader } from './profile-header';
import { ReminderSettings } from './reminder-settings';
import { SettingsPanel } from './settings-panel';
import { StatCards } from './stat-cards';
import { StudyHeatmap } from './study-heatmap';

/**
 * Écran Profil : identité, statistiques clés, activité, progression par domaine,
 * santé de la mémoire et réglages.
 *
 * Chaque chiffre vient de l'API `/profile`, agrégé côté serveur depuis les
 * données FSRS et de progression déjà stockées — rien n'est inventé ici.
 */
export function ProfileScreen(): ReactElement {
  const userId = useUserId();
  const profile = useProfile(userId);

  if (profile.isError) {
    return <ProfileError onRetry={() => void profile.refetch()} />;
  }

  if (profile.data === undefined) {
    return <ProfileSkeleton />;
  }

  const data = profile.data;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <ProfileHeader user={data.user} />

      <Section title="Statistiques">
        <StatCards stats={data.stats} />
      </Section>

      <Section title="Activité des 30 derniers jours">
        <ActivityChart activity={data.activity} />
      </Section>

      <Section title="Assiduité">
        <StudyHeatmap activity={data.activity} />
      </Section>

      {data.domains.length > 0 && (
        <Section title="Progression par domaine">
          <DomainProgress domains={data.domains} />
        </Section>
      )}

      <Section
        title="Santé de la mémoire"
        subtitle="Où en sont tes cartes dans l'ancrage à long terme."
      >
        <MemoryHealthCard health={data.memoryHealth} />
      </Section>

      <Section title="Réglages">
        <SettingsPanel dailyGoal={data.settings.dailyGoal} />
      </Section>

      <Section title="Rappels">
        <ReminderSettings />
      </Section>
    </div>
  );
}

/** Un bloc titré de l'écran. */
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactElement;
}): ReactElement {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
        {subtitle !== undefined && (
          <p className="text-sm font-bold text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function ProfileSkeleton(): ReactElement {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-8" aria-busy="true" aria-live="polite">
      <div className="h-28 animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
      <span className="sr-only">Chargement de ton profil.</span>
    </div>
  );
}

function ProfileError({ onRetry }: { onRetry: () => void }): ReactElement {
  return (
    <div
      role="alert"
      className="flex w-full max-w-md flex-col items-center gap-4 text-center"
    >
      <Mascot mood="encouraging" size="lg" />
      <h1 className="text-2xl font-extrabold">Profil indisponible</h1>
      <p className="text-base font-bold leading-relaxed text-muted-foreground">
        Impossible de charger tes statistiques pour le moment. Vérifie que l&apos;API tourne (
        <code className="font-extrabold">pnpm dev</code>).
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-extrabold text-macaw underline underline-offset-2"
      >
        Réessayer
      </button>
    </div>
  );
}
