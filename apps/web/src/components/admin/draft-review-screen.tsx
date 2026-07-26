'use client';

import { Button, Mascot } from '@bayt/ui';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactElement } from 'react';

import { ApiError } from '@/lib/api/client';
import type { AuditVerdict, DraftCard } from '@/lib/api/draft-types';
import { useDraft, usePublishDraft } from '@/lib/api/studio-queries';

import { AddCard, DraftCardRow } from './draft-card-row';

/**
 * Écran de relecture d'un brouillon de leçon sourcée.
 *
 * Chaque carte est **éditable**, affiche son extrait source + le lien cliquable,
 * et ses annotations d'audit ([À VÉRIFIER], NON SOUTENUE) en évidence. Seules
 * les cartes **validées** sont publiées ; un brouillon n'apparaît jamais dans
 * l'app tant qu'il n'est pas publié.
 */
export function DraftReviewScreen({ draftId }: { draftId: string }): ReactElement {
  const draft = useDraft(draftId);
  const publish = usePublishDraft(draftId);
  const [published, setPublished] = useState<number | null>(null);

  if (draft.error instanceof ApiError && draft.error.status === 403) {
    return <Forbidden />;
  }
  if (draft.isError) {
    return <NotFound />;
  }
  if (draft.data === undefined) {
    return <Skeleton />;
  }

  const data = draft.data;

  // Génération asynchrone (vocabulaire) : le brouillon se remplit en tâche de
  // fond ; `useDraft` interroge jusqu'à la finalisation.
  if (data.status === 'generating') {
    return <Generating topic={data.topic} />;
  }
  if (data.status === 'failed') {
    return <Failed topic={data.topic} error={data.error} />;
  }

  const validated = data.cards.filter((c) => c.status === 'validated').length;
  const isPublished = data.status === 'published';

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin" className="text-sm font-extrabold text-macaw underline underline-offset-2">
          ← Admin
        </Link>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
            isPublished ? 'bg-feather-green/15 text-feather-green' : 'bg-bee/20 text-[#8a6d00]'
          }`}
        >
          {isPublished ? 'publiée' : 'brouillon'}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight">{data.topic}</h1>
        <p className="text-sm font-bold text-muted-foreground">
          {data.cards.length} carte{data.cards.length > 1 ? 's' : ''} · {validated} validée
          {validated > 1 ? 's' : ''}
        </p>
      </div>

      {data.sensitive && (
        <div className="flex items-start gap-3 rounded-[var(--radius-card)] border-2 border-bee/50 bg-bee/10 p-4">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#8a6d00]" />
          <p className="text-sm font-bold text-[#8a6d00]">
            Domaine sensible : vérifie auprès de la source officielle avant de mémoriser.
          </p>
        </div>
      )}

      <AuditSummary cards={data.cards} />

      <ul className="flex flex-col gap-4">
        {data.cards.map((card) => (
          <DraftCardRow key={card.id} draftId={draftId} card={card} disabled={isPublished} />
        ))}
      </ul>

      {!isPublished && <AddCardForm draftId={draftId} />}

      {/* Publication : seules les cartes validées entrent en mémoire. */}
      <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-2">
        {published !== null ? (
          <div
            role="status"
            className="flex items-center gap-3 rounded-[var(--radius-card)] border-2 border-feather-green/40 bg-feather-green/10 p-4"
          >
            <Mascot mood="celebrating" size="sm" />
            <p className="text-sm font-bold text-foreground">
              {published} carte{published > 1 ? 's' : ''} publiée{published > 1 ? 's' : ''} dans le
              domaine. Elles entrent maintenant dans les révisions.
            </p>
          </div>
        ) : (
          <Button
            variant="brand"
            size="lg"
            disabled={isPublished || validated === 0 || publish.isPending}
            onClick={() => publish.mutate(undefined, { onSuccess: (r) => setPublished(r.published) })}
            className="w-full"
          >
            {publish.isPending
              ? 'Publication…'
              : validated === 0
                ? 'Valide au moins une carte pour publier'
                : `Publier ${String(validated)} carte${validated > 1 ? 's' : ''} validée${validated > 1 ? 's' : ''}`}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Récapitulatif d'audit : combien de cartes demandent une vérification. */
function AuditSummary({ cards }: { cards: readonly DraftCard[] }): ReactElement | null {
  const counts: Record<AuditVerdict, number> = { ok: 0, to_verify: 0, unsupported: 0 };
  for (const card of cards) {
    counts[card.auditVerdict] += 1;
  }

  if (counts.to_verify === 0 && counts.unsupported === 0) {
    return null;
  }

  return (
    <p className="text-sm font-bold text-muted-foreground">
      Audit : <span className="font-black text-feather-green">{counts.ok} OK</span>
      {counts.to_verify > 0 && (
        <>
          {' · '}
          <span className="font-black text-[#8a6d00]">{counts.to_verify} à vérifier</span>
        </>
      )}
      {counts.unsupported > 0 && (
        <>
          {' · '}
          <span className="font-black text-cardinal">{counts.unsupported} non soutenue(s)</span>
        </>
      )}
    </p>
  );
}

/** Formulaire d'ajout manuel d'une carte (source obligatoire). */
function AddCardForm({ draftId }: { draftId: string }): ReactElement {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-full border-2 border-dashed border-border-strong px-4 py-2 text-sm font-extrabold text-muted-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        + Ajouter une carte
      </button>
    );
  }

  return <AddCard draftId={draftId} onDone={() => setOpen(false)} />;
}

function Skeleton(): ReactElement {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4" aria-busy="true">
      <div className="h-8 w-1/2 animate-pulse rounded bg-surface-hover" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
      ))}
      <span className="sr-only">Chargement du brouillon.</span>
    </div>
  );
}

/** Brouillon en cours de génération (asynchrone) — l'écran s'actualise seul. */
function Generating({ topic }: { topic: string }): ReactElement {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <Link href="/admin" className="text-sm font-extrabold text-macaw underline underline-offset-2">
        ← Admin
      </Link>
      <div
        className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 aria-hidden="true" className="size-8 animate-spin text-macaw" />
        <h1 className="text-xl font-black tracking-tight">{topic}</h1>
        <p className="text-sm font-bold text-muted-foreground">
          Génération en cours… BAYT prépare les mots. Cet écran s&apos;actualise tout seul.
        </p>
      </div>
    </div>
  );
}

/** Génération échouée : motif + relance possible. */
function Failed({ topic, error }: { topic: string; error: string | null }): ReactElement {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <Link href="/admin" className="text-sm font-extrabold text-macaw underline underline-offset-2">
        ← Admin
      </Link>
      <div
        className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border-2 border-cardinal/40 bg-cardinal/10 p-6"
        role="alert"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle aria-hidden="true" className="size-5 text-cardinal" />
          <h1 className="text-lg font-black tracking-tight">{topic}</h1>
        </div>
        <p className="text-sm font-bold text-muted-foreground">
          {error ?? 'La génération a échoué. Réessaie depuis le studio.'}
        </p>
        <Link href="/admin" className="text-sm font-extrabold text-macaw underline underline-offset-2">
          Retour au studio
        </Link>
      </div>
    </div>
  );
}

function Forbidden(): ReactElement {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 text-center" role="alert">
      <Mascot mood="idle" size="lg" />
      <h1 className="text-2xl font-extrabold">Accès réservé</h1>
      <Link href="/" className="text-sm font-extrabold text-macaw underline underline-offset-2">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

function NotFound(): ReactElement {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 text-center" role="alert">
      <Mascot mood="idle" size="lg" />
      <h1 className="text-2xl font-extrabold">Brouillon introuvable</h1>
      <Link href="/admin" className="text-sm font-extrabold text-macaw underline underline-offset-2">
        Retour à l&apos;admin
      </Link>
    </div>
  );
}
