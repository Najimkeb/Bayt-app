'use client';

import { Surface, buttonVariants } from '@bayt/ui';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useRef, type ReactElement } from 'react';

import type { DocumentDto } from '@/lib/api/document-types';
import { useDocumentCards } from '@/lib/api/document-queries';

/**
 * Aperçu des cartes générées d'un document, en fenêtre modale.
 *
 * Accessibilité : `role="dialog"` + `aria-modal`, focus posé à l'ouverture,
 * fermeture par Échap et par le fond, focus rendu à l'élément déclencheur à la
 * fermeture. Les cartes montrent recto **et** verso — c'est le produit fini que
 * l'apprenant vient de créer, il a le droit de le relire.
 */
export function CardPreview({
  document,
  onClose,
}: {
  document: DocumentDto;
  onClose: () => void;
}): ReactElement {
  const reduceMotion = useReducedMotion();
  const cards = useDocumentCards(document.id);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = 'card-preview-title';

  // Focus à l'ouverture ; restauration à la fermeture ; fermeture par Échap.
  useEffect(() => {
    const trigger = window.document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.document.addEventListener('keydown', onKeyDown);
    // Empêche le défilement de l'arrière-plan tant que la modale est ouverte.
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';

    return () => {
      window.document.removeEventListener('keydown', onKeyDown);
      window.document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Fond : ferme au clic, décoratif pour les lecteurs d'écran. */}
      <motion.button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 size-full cursor-default bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-[var(--radius-card)] border-2 border-border bg-background sm:rounded-[var(--radius-card)]"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.2 }}
      >
        <header className="flex items-start justify-between gap-3 border-b-2 border-border p-5">
          <div className="flex min-w-0 flex-col">
            <h2 id={titleId} className="truncate text-lg font-black">
              {document.filename}
            </h2>
            <p className="text-sm font-bold text-muted-foreground">
              {document.cardCount} carte{document.cardCount > 1 ? 's' : ''} générée
              {document.cardCount > 1 ? 's' : ''}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer l'aperçu"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-lg font-black text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {cards.isPending ? (
            <PreviewSkeleton />
          ) : cards.isError ? (
            <p role="alert" className="text-center text-sm font-bold text-cardinal">
              Impossible de charger les cartes. Réessaie dans un instant.
            </p>
          ) : cards.data.cards.length === 0 ? (
            <p className="text-center text-sm font-bold text-muted-foreground">
              Aucune carte n&apos;a été générée pour ce document.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {cards.data.cards.map((card, index) => (
                <li key={card.id}>
                  <Surface className="flex flex-col gap-2 p-4">
                    <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                      Carte {index + 1}
                    </span>
                    <p className="text-base font-extrabold">{card.front}</p>
                    <p className="border-t border-border pt-2 text-base font-bold text-feather-green">
                      {card.back}
                    </p>
                  </Surface>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t-2 border-border p-5">
          <Link
            href="/review"
            className={`${buttonVariants({ variant: 'brand', size: 'lg' })} w-full`}
          >
            Lancer une révision
          </Link>
        </footer>
      </motion.div>
    </div>
  );
}

function PreviewSkeleton(): ReactElement {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface-hover" />
      ))}
      <span className="sr-only">Chargement des cartes.</span>
    </div>
  );
}

/** Enveloppe l'apparition/disparition dans `AnimatePresence`. */
export function CardPreviewLayer({
  document,
  onClose,
}: {
  document: DocumentDto | null;
  onClose: () => void;
}): ReactElement {
  return (
    <AnimatePresence>
      {document !== null && <CardPreview key={document.id} document={document} onClose={onClose} />}
    </AnimatePresence>
  );
}
