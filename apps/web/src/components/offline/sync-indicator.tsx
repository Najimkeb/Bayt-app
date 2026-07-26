'use client';

import { Check, CloudOff, RefreshCw, Wifi } from 'lucide-react';
import type { ReactElement } from 'react';

import { useSync } from '@/lib/offline/sync-provider';

/**
 * Indicateur discret d'état réseau + synchronisation, pour l'en-tête.
 *
 * - hors-ligne : pastille « Hors-ligne » (ambre) ;
 * - file en attente : « X à synchroniser » ;
 * - synchro en cours / vient de finir : retour visuel bref ;
 * - en ligne et rien en attente : rien (on ne surcharge pas l'en-tête).
 *
 * L'information est portée par le texte (pas seulement la couleur — WCAG 1.4.1)
 * et annoncée poliment (`aria-live`).
 */
export function SyncIndicator(): ReactElement | null {
  const { online, pending, syncing, justSynced } = useSync();

  // Rien à signaler : en ligne, file vide, pas de synchro récente.
  if (online && pending === 0 && !syncing && !justSynced) {
    return null;
  }

  const { icon, label, tone } = describe({ online, pending, syncing });

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-extrabold ${tone}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </span>
  );
}

function describe({
  online,
  pending,
  syncing,
}: {
  online: boolean;
  pending: number;
  syncing: boolean;
}): { icon: ReactElement; label: string; tone: string } {
  const iconClass = 'size-3.5';

  if (!online) {
    return {
      icon: <CloudOff aria-hidden="true" className={iconClass} />,
      label: pending > 0 ? `Hors-ligne · ${String(pending)} en attente` : 'Hors-ligne',
      tone: 'border-bee/50 bg-bee/10 text-[#8a6d00]',
    };
  }
  if (syncing) {
    return {
      icon: <RefreshCw aria-hidden="true" className={`${iconClass} animate-spin`} />,
      label: 'Synchronisation…',
      tone: 'border-macaw/40 bg-macaw/10 text-macaw',
    };
  }
  if (pending > 0) {
    return {
      icon: <Wifi aria-hidden="true" className={iconClass} />,
      label: `${String(pending)} à synchroniser`,
      tone: 'border-macaw/40 bg-macaw/10 text-macaw',
    };
  }

  return {
    icon: <Check aria-hidden="true" className={iconClass} />,
    label: 'Synchronisé',
    tone: 'border-feather-green/40 bg-feather-green/10 text-feather-green',
  };
}
