'use client';

import { Button } from '@bayt/ui';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent, type ReactElement } from 'react';

import { OfflineNotice } from '@/components/offline/offline-notice';
import { useDomains } from '@/lib/api/domain-queries';
import type { DraftSummary, LessonLevel } from '@/lib/api/draft-types';
import { useDrafts, useGenerateLesson } from '@/lib/api/studio-queries';
import { useUserId } from '@/lib/auth/use-user-id';
import { useSync } from '@/lib/offline/sync-provider';

const LEVELS: readonly { value: LessonLevel; label: string }[] = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

const LEVEL_LABEL: Record<LessonLevel, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

/** Pastille de statut d'un brouillon (les 4 états). */
const DRAFT_BADGE: Record<DraftSummary['status'], { label: string; className: string }> = {
  generating: { label: 'génération…', className: 'bg-macaw/15 text-macaw' },
  draft: { label: 'brouillon', className: 'bg-bee/20 text-[#8a6d00]' },
  published: { label: 'publiée', className: 'bg-feather-green/15 text-feather-green' },
  failed: { label: 'échec', className: 'bg-cardinal/15 text-cardinal' },
};

/**
 * Outil « Générer une leçon sourcée » + liste des brouillons.
 *
 * L'admin saisit un sujet, un domaine et un niveau ; le Worker cherche sur le
 * web, génère des cartes groundées et audité es, puis ouvre l'écran de relecture.
 * Rien n'est publié automatiquement.
 */
export function StudioPanel(): ReactElement {
  const router = useRouter();
  const ids = useId();
  const userId = useUserId();
  const { online } = useSync();
  const domains = useDomains(userId);
  const generate = useGenerateLesson();
  const drafts = useDrafts();

  const [topic, setTopic] = useState('');
  const [domainId, setDomainId] = useState('');
  const [level, setLevel] = useState<LessonLevel>('beginner');
  const [error, setError] = useState<string | null>(null);

  const domainList = domains.data?.domains ?? [];

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    generate.mutate(
      { topic: topic.trim(), domainId: domainId || (domainList[0]?.id ?? ''), level },
      {
        onSuccess: ({ draftId }) => router.push(`/admin/lessons/${draftId}`),
        onError: (err) =>
          setError(
            err.message === '501'
              ? 'Recherche web non configurée (secrets AI Gateway / Anthropic manquants).'
              : 'La génération a échoué. Reformule le sujet ou réessaie.',
          ),
      },
    );
  }

  if (!online) {
    return <OfflineNotice action="Générer une leçon sourcée" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-5"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${ids}-topic`} className="text-sm font-extrabold">
            Sujet
          </label>
          <input
            id={`${ids}-topic`}
            type="text"
            required
            minLength={3}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex. Les fondamentaux du RGPD"
            className="w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 py-3 text-base font-bold text-foreground focus-visible:border-macaw focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-domain`} className="text-sm font-extrabold">
              Domaine cible
            </label>
            <select
              id={`${ids}-domain`}
              value={domainId}
              onChange={(e) => setDomainId(e.target.value)}
              className="h-12 rounded-[var(--radius-card)] border-2 border-border bg-surface px-3 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {domainList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-level`} className="text-sm font-extrabold">
              Niveau
            </label>
            <select
              id={`${ids}-level`}
              value={level}
              onChange={(e) => setLevel(e.target.value as LessonLevel)}
              className="h-12 rounded-[var(--radius-card)] border-2 border-border bg-surface px-3 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error !== null && (
          <p role="alert" className="text-sm font-bold text-cardinal">
            {error}
          </p>
        )}

        <Button type="submit" variant="brand" size="md" disabled={generate.isPending} className="self-start">
          <Sparkles aria-hidden="true" className="size-4" />
          {generate.isPending ? 'Recherche et rédaction…' : 'Générer une leçon sourcée'}
        </Button>
        <p className="text-xs font-bold text-muted-foreground">
          L&apos;IA cherche sur le web et rédige à partir des sources trouvées. Tu relis et valides
          avant toute publication — rien n&apos;entre en mémoire sans ta validation.
        </p>
      </form>

      {/* Brouillons existants */}
      {drafts.data !== undefined && drafts.data.drafts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {drafts.data.drafts.map((draft) => (
            <li key={draft.id}>
              <Link
                href={`/admin/lessons/${draft.id}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-extrabold">{draft.topic}</span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {draft.cardCount} carte{draft.cardCount > 1 ? 's' : ''} · {LEVEL_LABEL[draft.level]}
                  </span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-black ${DRAFT_BADGE[draft.status].className}`}>
                  {DRAFT_BADGE[draft.status].label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
