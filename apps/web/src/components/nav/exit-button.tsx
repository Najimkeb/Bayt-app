'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Bouton « Quitter » des écrans en pleine tâche (révision, leçon).
 *
 * Ramène à l'accueil. Si une session est en cours (`confirmWhen`), une
 * confirmation évite de perdre la progression par erreur. Le dialogue est
 * accessible (focus piégé, `Échap` pour annuler) — jamais un `confirm()` natif
 * (qui bloquerait la page).
 */
export function ExitButton({
  confirmWhen,
  confirmBody = 'Ta progression dans cette session ne sera pas conservée.',
}: {
  confirmWhen: boolean;
  confirmBody?: string;
}): ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const leave = (): void => {
    router.push('/');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (confirmWhen ? setOpen(true) : leave())}
        aria-label="Quitter et revenir à l'accueil"
        className="inline-flex size-10 items-center justify-center rounded-full border-2 border-border text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <X aria-hidden="true" className="size-5" />
      </button>

      {open && <ConfirmDialog body={confirmBody} onCancel={() => setOpen(false)} onConfirm={leave} />}
    </>
  );
}

/** Dialogue de confirmation modal, accessible. */
function ConfirmDialog({
  body,
  onCancel,
  onConfirm,
}: {
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
}): ReactElement {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onCancel();
      }
    }
    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="exit-dialog-title"
        aria-describedby="exit-dialog-body"
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-6 shadow-xl"
      >
        <h2 id="exit-dialog-title" className="text-xl font-black">
          Quitter la session ?
        </h2>
        <p id="exit-dialog-body" className="text-sm font-bold text-muted-foreground">
          {body}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            className="pressable inline-flex h-12 items-center justify-center rounded-[var(--radius-button)] px-6 font-extrabold uppercase tracking-wide [--btn-bg:var(--color-cardinal)] [--btn-fg:#fff] [--btn-shadow:var(--color-cardinal-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Quitter
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex h-12 items-center justify-center rounded-[var(--radius-button)] border-2 border-border px-6 font-extrabold uppercase tracking-wide transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Rester
          </button>
        </div>
      </div>
    </div>
  );
}
