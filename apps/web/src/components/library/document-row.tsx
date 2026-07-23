'use client';

import type { ReactElement, ReactNode } from 'react';

import type { DocumentDto } from '@/lib/api/document-types';

import { formatDate, formatIcon, isPreviewable, statusView } from './document-status';

/**
 * Une ligne de la liste des documents.
 *
 * Un document `ready` est un `<button>` cliquable (ouvre l'aperçu des cartes) ;
 * les autres états sont un simple conteneur. L'échec affiche son motif en clair.
 */
export function DocumentRow({
  document,
  onOpen,
}: {
  document: DocumentDto;
  onOpen: (document: DocumentDto) => void;
}): ReactElement {
  const view = statusView(document);
  const previewable = isPreviewable(document.status);

  const inner = (
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

  const base =
    'flex w-full items-center gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4 text-left';

  if (previewable) {
    return (
      <Shell>
        <button
          type="button"
          onClick={() => onOpen(document)}
          aria-label={`Voir les cartes de ${document.filename} (${view.label})`}
          className={`${base} transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
        >
          {inner}
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className={base}>{inner}</div>
    </Shell>
  );
}

/** Élément de liste : porte la sémantique `<li>`. */
function Shell({ children }: { children: ReactNode }): ReactElement {
  return <li>{children}</li>;
}
