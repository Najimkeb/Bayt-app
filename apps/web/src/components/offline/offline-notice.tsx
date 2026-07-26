'use client';

import { CloudOff } from 'lucide-react';
import type { ReactElement } from 'react';

/**
 * Message clair quand une action nécessite le réseau (dépôt de document,
 * génération de leçon…). v1 : seule la révision fonctionne hors-ligne.
 */
export function OfflineNotice({ action }: { action?: string }): ReactElement {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-[var(--radius-card)] border-2 border-bee/50 bg-bee/10 p-4"
    >
      <CloudOff aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#8a6d00]" />
      <p className="text-sm font-bold text-[#8a6d00]">
        {action ?? 'Cette action'} nécessite une connexion. Reviens en ligne pour continuer — tes
        révisions, elles, fonctionnent hors-ligne.
      </p>
    </div>
  );
}
