'use client';

import { useState, type ReactElement } from 'react';

import type { DocumentDto } from '@/lib/api/document-types';

import { formatDate, formatIcon, isPreviewable, statusView } from './document-status';

/**
 * Une ligne de la liste des documents.
 *
 * Un document `ready` ouvre l'aperçu des cartes ; les autres états sont
 * statiques. L'échec affiche son motif. Chaque ligne offre une suppression, en
 * deux temps (clic → confirmation en ligne) car l'action est irréversible.
 */
export function DocumentRow({
  document,
  onOpen,
  onDelete,
}: {
  document: DocumentDto;
  onOpen: (document: DocumentDto) => void;
  onDelete: (document: DocumentDto) => void;
}): ReactElement {
  const [confirming, setConfirming] = useState(false);
  const view = statusView(document);
  const previewable = isPreviewable(document.status);

  if (confirming) {
    return (
      <li className="flex items-center gap-2 rounded-[var(--radius-card)] border-2 border-cardinal/40 bg-cardinal/5 p-3">
        <span className="flex-1 text-sm font-bold">
          Supprimer «&nbsp;{document.filename}&nbsp;» et ses cartes ?
        </span>
        <button
          type="button"
          onClick={() => onDelete(document)}
          className="rounded-xl bg-cardinal px-3 py-1.5 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Supprimer
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-xl px-3 py-1.5 text-sm font-extrabold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Annuler
        </button>
      </li>
    );
  }

  const body = (
    <>
      <span aria-hidden="true" className="shrink-0 text-2xl">
        {formatIcon(document.format)}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-extrabold">{document.filename}</span>
        <span className="text-xs font-bold text-muted-foreground">
          {formatDate(document.createdAt)}
        </span>
        {document.status === 'failed' && document.error !== null && (
          <span className="mt-1 text-xs font-bold text-cardinal">{document.error}</span>
        )}
      </span>

      <span
        className={[
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold',
          view.badgeClass,
        ].join(' ')}
      >
        <span aria-hidden="true" className={view.pulsing ? 'animate-pulse' : ''}>
          {view.icon}
        </span>
        {view.label}
      </span>

      {previewable && (
        <span aria-hidden="true" className="shrink-0 text-lg text-muted-foreground">
          ›
        </span>
      )}
    </>
  );

  const bodyClass = 'flex flex-1 items-center gap-3 p-4 text-left';

  return (
    <li className="flex items-stretch overflow-hidden rounded-[var(--radius-card)] border-2 border-border bg-surface">
      {previewable ? (
        <button
          type="button"
          onClick={() => onOpen(document)}
          aria-label={`Voir les cartes de ${document.filename} (${view.label})`}
          className={`${bodyClass} transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`}
        >
          {body}
        </button>
      ) : (
        <div className={bodyClass}>{body}</div>
      )}

      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Supprimer ${document.filename}`}
        className="flex shrink-0 items-center border-l-2 border-border px-3 text-muted-foreground transition-colors hover:bg-cardinal/10 hover:text-cardinal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <TrashIcon />
      </button>
    </li>
  );
}

/** Icône corbeille, décorative (le libellé est porté par `aria-label`). */
function TrashIcon(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
