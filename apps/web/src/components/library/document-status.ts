import type { DocumentDto, DocumentStatus } from '@/lib/api/document-types';

/** Présentation visuelle d'un statut : libellé, ton de couleur, icône. */
export interface StatusView {
  readonly label: string;
  /** Classe Tailwind du badge (couleur + fond), jamais la couleur seule. */
  readonly badgeClass: string;
  readonly icon: string;
  /** Le statut est-il un état d'attente animé (spinner) ? */
  readonly pulsing: boolean;
}

/**
 * Traduit le statut d'un document en éléments d'affichage.
 *
 * La couleur n'est jamais le seul indice : chaque état porte un libellé et une
 * icône (WCAG 1.4.1). Pour `ready`, le nombre de cartes est intégré au libellé.
 */
export function statusView(document: Pick<DocumentDto, 'status' | 'cardCount'>): StatusView {
  switch (document.status) {
    case 'pending':
      return {
        label: 'En file',
        badgeClass: 'bg-surface-hover text-muted-foreground',
        icon: '🕘',
        pulsing: true,
      };
    case 'processing':
      return {
        label: 'Traitement…',
        badgeClass: 'bg-macaw/15 text-macaw',
        icon: '⚙️',
        pulsing: true,
      };
    case 'ready':
      return {
        label: `${String(document.cardCount)} carte${document.cardCount > 1 ? 's' : ''}`,
        badgeClass: 'bg-feather-green/15 text-feather-green',
        icon: '✅',
        pulsing: false,
      };
    case 'failed':
      return {
        label: 'Échec',
        badgeClass: 'bg-cardinal/15 text-cardinal',
        icon: '⚠️',
        pulsing: false,
      };
  }
}

/** Phrase complète annoncée aux lecteurs d'écran quand un statut évolue. */
export function statusAnnouncement(document: DocumentDto): string {
  switch (document.status) {
    case 'pending':
      return `${document.filename} : en file d'attente.`;
    case 'processing':
      return `${document.filename} : traitement en cours.`;
    case 'ready':
      return `${document.filename} : prêt, ${String(document.cardCount)} carte${
        document.cardCount > 1 ? 's' : ''
      } générée${document.cardCount > 1 ? 's' : ''}.`;
    case 'failed':
      return `${document.filename} : échec du traitement. ${document.error ?? ''}`.trim();
  }
}

/** Date lisible et courte, dans la langue de l'interface. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

const FORMAT_ICON: Record<DocumentDto['format'], string> = {
  pdf: '📕',
  text: '📄',
  markdown: '📝',
  word: '📘',
  powerpoint: '📙',
};

export function formatIcon(format: DocumentDto['format']): string {
  return FORMAT_ICON[format];
}

/** Un statut ouvre-t-il l'aperçu des cartes ? (uniquement `ready`). */
export function isPreviewable(status: DocumentStatus): boolean {
  return status === 'ready';
}
