'use client';

import { useRef, useState, type DragEvent, type ReactElement } from 'react';

import { ACCEPT_ATTR, ACCEPTED_LABEL, MAX_SIZE_LABEL, validateFile } from '@/lib/documents';

/**
 * Zone de dépôt d'un document — glisser-déposer + bouton fichier.
 *
 * Accessibilité : la zone entière est un `<button>` (focusable, activable au
 * clavier par Entrée/Espace) qui ouvre le sélecteur de fichier natif — lequel
 * fonctionne aussi bien à la souris, au clavier qu'au toucher (mobile). Le
 * glisser-déposer est un **plus** pour la souris, jamais le seul chemin.
 *
 * La validation (format, taille) est faite ici pour un retour immédiat ; les
 * refus sont remontés via `onReject` et annoncés par l'écran parent.
 */
export function Dropzone({
  onFile,
  onReject,
  busy,
}: {
  /** Fichier accepté, prêt à envoyer. */
  onFile: (file: File) => void;
  /** Fichier refusé côté client, avec le motif. */
  onReject: (reason: string) => void;
  /** Un envoi est en cours : la zone est désactivée. */
  busy: boolean;
}): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null): void {
    const file = files?.[0];
    if (file === undefined) {
      return;
    }

    const result = validateFile(file);
    if (result.ok) {
      onFile(file);
    } else {
      onReject(result.reason);
    }
  }

  function onDrop(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setDragging(false);
    if (!busy) {
      handleFiles(event.dataTransfer.files);
    }
  }

  function onDragOver(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault();
    if (!busy) {
      setDragging(true);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        disabled={busy}
        aria-label={`Déposer un document ou choisir un fichier. Formats acceptés : ${ACCEPTED_LABEL}. Taille maximale : ${MAX_SIZE_LABEL}.`}
        className={[
          'flex w-full flex-col items-center justify-center gap-3 rounded-[var(--radius-card)]',
          'border-2 border-dashed px-6 py-10 text-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-60',
          dragging
            ? 'border-feather-green bg-feather-green/10'
            : 'border-border-strong bg-surface hover:bg-surface-hover',
        ].join(' ')}
      >
        <span aria-hidden="true" className="text-4xl">
          {busy ? '⏳' : '📄'}
        </span>
        <span className="text-lg font-extrabold">
          {busy ? 'Envoi en cours…' : 'Dépose un document ici'}
        </span>
        <span className="text-sm font-bold text-muted-foreground">
          ou <span className="text-macaw underline underline-offset-2">choisis un fichier</span>
        </span>
        <span className="mt-1 text-xs font-bold text-muted-foreground">
          {ACCEPTED_LABEL} · jusqu&apos;à {MAX_SIZE_LABEL}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          handleFiles(event.target.files);
          // Réinitialise pour permettre de re-déposer le même fichier.
          event.target.value = '';
        }}
      />
    </div>
  );
}
