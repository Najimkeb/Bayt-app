'use client';

import { Button } from '@bayt/ui';
import { Check, ExternalLink, Trash2 } from 'lucide-react';
import { useState, type CSSProperties, type ReactElement } from 'react';

import type { AuditVerdict, DraftCard } from '@/lib/api/draft-types';
import { useAddCard, useDeleteCard, useEditCard, useSetCardStatus } from '@/lib/api/studio-queries';

/** Style d'annotation d'audit — [À VÉRIFIER] et NON SOUTENUE bien en évidence. */
const AUDIT: Record<AuditVerdict, { label: string; className: string }> = {
  ok: { label: 'Soutenue', className: 'bg-feather-green/15 text-feather-green' },
  to_verify: { label: '[À VÉRIFIER]', className: 'bg-bee/25 text-[#8a6d00]' },
  unsupported: { label: 'NON SOUTENUE', className: 'bg-cardinal/15 text-cardinal' },
};

const inputClass =
  'w-full rounded-[var(--radius-button)] border-2 border-border bg-surface px-3 py-2 text-sm font-bold text-foreground focus-visible:border-macaw focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Une carte de brouillon en relecture : recto/verso éditables, extrait source
 * + lien cliquable, annotation d'audit en évidence, statut (à relire / validée),
 * suppression.
 */
export function DraftCardRow({
  draftId,
  card,
  disabled,
}: {
  draftId: string;
  card: DraftCard;
  disabled: boolean;
}): ReactElement {
  const edit = useEditCard(draftId);
  const setStatus = useSetCardStatus(draftId);
  const remove = useDeleteCard(draftId);

  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const dirty = front !== card.front || back !== card.back;
  const validated = card.status === 'validated';
  const audit = AUDIT[card.auditVerdict];

  return (
    <li
      className={`flex flex-col gap-3 rounded-[var(--radius-card)] border-2 p-4 ${
        validated ? 'border-feather-green/50 bg-feather-green/5' : 'border-border bg-surface'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-black ${audit.className}`}>
          {audit.label}
        </span>
        {card.auditReason !== null && (
          <span className="text-xs font-bold text-muted-foreground">{card.auditReason}</span>
        )}
      </div>

      {/* Recto / verso éditables */}
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-extrabold text-muted-foreground">Question</span>
          <input value={front} onChange={(e) => setFront(e.target.value)} disabled={disabled} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-extrabold text-muted-foreground">Réponse</span>
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            disabled={disabled}
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </label>
        {dirty && !disabled && (
          <button
            type="button"
            onClick={() => edit.mutate({ cardId: card.id, front, back })}
            disabled={edit.isPending}
            className="self-start rounded-full border-2 border-macaw px-3 py-1 text-xs font-extrabold text-macaw focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {edit.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        )}
      </div>

      {/* Source : extrait + lien cliquable */}
      <figure className="flex flex-col gap-1.5 rounded-[var(--radius-button)] border-l-4 border-macaw/40 bg-surface-hover/60 p-3">
        <blockquote className="text-xs font-bold italic text-muted-foreground">
          « {card.sourceExtract} »
        </blockquote>
        <figcaption>
          <a
            href={card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-extrabold text-macaw underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            <span className="max-w-[16rem] truncate">{card.sourceUrl}</span>
          </a>
        </figcaption>
      </figure>

      {/* Actions : statut + suppression */}
      {!disabled && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setStatus.mutate({ cardId: card.id, status: validated ? 'to_review' : 'validated' })}
            disabled={setStatus.isPending}
            aria-pressed={validated}
            className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              validated
                ? 'border-feather-green bg-feather-green/10 text-feather-green'
                : 'border-border text-muted-foreground hover:bg-surface-hover'
            }`}
          >
            <Check aria-hidden="true" className="size-3.5" />
            {validated ? 'Validée' : 'Valider'}
          </button>
          <button
            type="button"
            onClick={() => remove.mutate(card.id)}
            disabled={remove.isPending}
            aria-label="Supprimer cette carte"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-cardinal/10 hover:text-cardinal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
    </li>
  );
}

/** Formulaire d'ajout manuel d'une carte (source obligatoire — grounding). */
export function AddCard({ draftId, onDone }: { draftId: string; onDone: () => void }): ReactElement {
  const add = useAddCard(draftId);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceExtract, setSourceExtract] = useState('');

  const style = { gap: '0.5rem' } as CSSProperties;

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-border-strong bg-surface p-4" style={style}>
      <input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Question" className={inputClass} />
      <textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Réponse" rows={2} className={`${inputClass} resize-y`} />
      <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="URL de la source (https://…)" className={inputClass} />
      <textarea value={sourceExtract} onChange={(e) => setSourceExtract(e.target.value)} placeholder="Extrait source exact" rows={2} className={`${inputClass} resize-y`} />
      {add.isError && (
        <p role="alert" className="text-xs font-bold text-cardinal">
          Ajout impossible : vérifie l&apos;URL et remplis l&apos;extrait source.
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="green"
          size="sm"
          disabled={add.isPending}
          onClick={() =>
            add.mutate(
              { front: front.trim(), back: back.trim(), sourceUrl: sourceUrl.trim(), sourceExtract: sourceExtract.trim() },
              { onSuccess: onDone },
            )
          }
        >
          {add.isPending ? 'Ajout…' : 'Ajouter'}
        </Button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border-2 border-border px-4 py-2 text-sm font-extrabold text-muted-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
