/**
 * Règles de dépôt de document, côté client.
 *
 * L'API valide déjà le format (415) et le pipeline gère le reste ; ces règles
 * offrent surtout un retour **immédiat** à l'apprenant — avant tout envoi
 * réseau — pour les deux erreurs les plus courantes : format non pris en charge
 * et fichier trop lourd.
 */

/** Extensions réellement extractibles aujourd'hui (cf. API `format.ts`). */
export const ACCEPTED_EXTENSIONS = ['.pdf', '.txt', '.md', '.markdown'] as const;

/** Attribut `accept` de l'input fichier (extensions + types MIME). */
export const ACCEPT_ATTR = '.pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown';

/** Formats affichés à l'apprenant. */
export const ACCEPTED_LABEL = 'PDF, TXT, Markdown';

/** Taille maximale acceptée à l'upload. */
export const MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_SIZE_LABEL = '10 Mo';

/** Extension d'un nom de fichier, en minuscules, point compris (`.pdf`). */
function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');

  return dot === -1 ? '' : filename.slice(dot).toLowerCase();
}

/** Résultat d'une validation : accepté, ou refusé avec un motif lisible. */
export type FileValidation = { readonly ok: true } | { readonly ok: false; readonly reason: string };

/**
 * Valide un fichier avant l'envoi.
 *
 * On se base sur l'extension (le type MIME est peu fiable, surtout pour `.md`).
 */
export function validateFile(file: File): FileValidation {
  const ext = extensionOf(file.name);

  if (!ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
    return {
      ok: false,
      reason: `Format non pris en charge. Formats acceptés : ${ACCEPTED_LABEL}.`,
    };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return {
      ok: false,
      reason: `Fichier trop lourd (${formatBytes(file.size)}). Maximum : ${MAX_SIZE_LABEL}.`,
    };
  }

  return { ok: true };
}

/** Taille lisible : « 1,4 Mo », « 820 Ko ». */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} o`;
  }

  const kilo = bytes / 1024;
  if (kilo < 1024) {
    return `${String(Math.round(kilo))} Ko`;
  }

  const mega = kilo / 1024;

  return `${mega.toFixed(mega < 10 ? 1 : 0).replace('.', ',')} Mo`;
}
