'use client';

import { Mascot } from '@bayt/ui';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { useDomains } from '@/lib/api/domain-queries';
import type { DocumentDto } from '@/lib/api/document-types';
import { useDeleteDocument, useDocuments, useUploadDocument } from '@/lib/api/document-queries';
import { useUserId } from '@/lib/auth/use-user-id';

import { OfflineNotice } from '@/components/offline/offline-notice';
import { useSync } from '@/lib/offline/sync-provider';

import { CardPreviewLayer } from './card-preview';
import { DocumentRow } from './document-row';
import { DomainPicker } from './domain-picker';
import { statusAnnouncement } from './document-status';
import { Dropzone } from './dropzone';

/**
 * Bibliothèque — dépôt et suivi des documents ingérés.
 *
 * Un document déposé apparaît aussitôt dans la liste (statut `pending`), puis
 * son avancement est suivi par polling léger jusqu'à `ready`/`failed`. Un
 * document prêt s'ouvre pour prévisualiser ses cartes et lancer une révision.
 *
 * Au dépôt, l'apprenant choisit le **domaine** de rattachement : les cartes
 * générées en héritent, ce qui alimente la révision par domaine.
 */
export function LibraryScreen({
  initialDomainId = null,
}: {
  initialDomainId?: string | null;
}): ReactElement {
  const userId = useUserId();
  const { online } = useSync();
  const domains = useDomains(userId);
  const documents = useDocuments(userId);
  const upload = useUploadDocument(userId);
  const remove = useDeleteDocument(userId);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DocumentDto | null>(null);
  const [announcement, setAnnouncement] = useState('');
  /** Domaine de rattachement du prochain dépôt (présélectionné via `?domain=`). */
  const [domainId, setDomainId] = useState<string | null>(initialDomainId);

  const list = documents.data?.documents ?? [];
  const domainList = domains.data?.domains ?? [];

  // Annonce aux lecteurs d'écran les documents qui viennent d'aboutir
  // (`ready`/`failed`), en comparant au statut précédemment vu.
  const seenStatus = useRef(new Map<string, DocumentDto['status']>());
  useEffect(() => {
    for (const document of list) {
      const previous = seenStatus.current.get(document.id);
      if (
        previous !== undefined &&
        previous !== document.status &&
        (document.status === 'ready' || document.status === 'failed')
      ) {
        setAnnouncement(statusAnnouncement(document));
      }
      seenStatus.current.set(document.id, document.status);
    }
  }, [list]);

  function handleFile(file: File): void {
    setUploadError(null);
    upload.mutate(
      { file, domainId },
      {
        onError: (error) => {
          setUploadError(error.message);
        },
      },
    );
  }

  const isEmpty = documents.isSuccess && list.length === 0;

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black">Bibliothèque</h1>
          <p className="text-sm font-bold text-muted-foreground">
            Transforme tes documents en cartes à réviser.
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 text-sm font-extrabold text-macaw underline underline-offset-2"
        >
          ← Accueil
        </Link>
      </div>

      {!online ? (
        <OfflineNotice action="Déposer un document" />
      ) : (
        <>
          {domainList.length > 0 && (
            <DomainPicker
              domains={domainList}
              value={domainId}
              onChange={setDomainId}
              disabled={upload.isPending}
            />
          )}

          <Dropzone onFile={handleFile} onReject={setUploadError} busy={upload.isPending} />
        </>
      )}

      {/* Erreur d'upload / de validation — annoncée immédiatement. */}
      {uploadError !== null && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[var(--radius-card)] border-2 border-cardinal/40 bg-cardinal/10 p-4"
        >
          <span aria-hidden="true" className="text-lg">
            ⚠️
          </span>
          <p className="text-sm font-bold text-cardinal">{uploadError}</p>
        </div>
      )}

      {/* Région d'annonce des changements de statut (discrète, polie). */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {documents.isError ? (
        <ListError onRetry={() => void documents.refetch()} />
      ) : documents.isPending ? (
        <ListSkeleton />
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              onOpen={setSelected}
              onDelete={(doc) => {
                if (selected?.id === doc.id) {
                  setSelected(null);
                }
                remove.mutate(doc.id);
              }}
            />
          ))}
        </ul>
      )}

      <CardPreviewLayer document={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/** Liste vide : une invitation chaleureuse à déposer un premier document. */
function EmptyState(): ReactElement {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-8 text-center">
      <Mascot mood="encouraging" size="md" priority />
      <p className="text-lg font-extrabold">Ta bibliothèque est vide</p>
      <p className="max-w-sm text-sm font-bold text-muted-foreground">
        Dépose un premier document — un cours, des notes, un PDF — et je le transforme en cartes à
        réviser. On commence ?
      </p>
    </div>
  );
}

function ListSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
      ))}
      <span className="sr-only">Chargement des documents.</span>
    </div>
  );
}

function ListError({ onRetry }: { onRetry: () => void }): ReactElement {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-6 text-center"
    >
      <p className="text-base font-bold text-muted-foreground">
        Impossible de charger tes documents. Vérifie que l&apos;API tourne (
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
