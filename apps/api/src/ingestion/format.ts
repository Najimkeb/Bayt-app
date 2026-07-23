/**
 * Formats de document du contexte « Knowledge Ingestion ».
 *
 * PDF / texte / Markdown sont extractibles dès maintenant. Word / PowerPoint
 * font partie du modèle (point d'extension explicite) mais ne sont pas encore
 * extraits.
 */
export const DOCUMENT_FORMATS = ['pdf', 'text', 'markdown', 'word', 'powerpoint'] as const;

export type DocumentFormat = (typeof DOCUMENT_FORMATS)[number];

/** Formats dont on sait extraire le texte aujourd'hui. */
export const EXTRACTABLE_FORMATS: readonly DocumentFormat[] = ['pdf', 'text', 'markdown'];

/** Erreur : format non pris en charge à l'upload. */
export class UnsupportedFormatError extends Error {
  public override readonly name = 'UnsupportedFormatError';

  public constructor(public readonly detail: string) {
    super(`Format non pris en charge : ${detail}`);
  }
}

/** Extension de fichier en minuscules, sans le point. */
function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');

  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
}

/**
 * Déduit le format d'un document depuis son type MIME puis son extension.
 *
 * Lève `UnsupportedFormatError` pour un format inconnu ou pas encore extractible
 * (Word / PowerPoint) — leur prise en charge s'ajoutera ici et dans
 * `text-extractor.ts`, sans toucher au reste du pipeline.
 */
export function detectFormat(filename: string, contentType: string | null): DocumentFormat {
  const type = (contentType ?? '').toLowerCase();
  const ext = extensionOf(filename);

  if (type.includes('pdf') || ext === 'pdf') {
    return 'pdf';
  }
  if (type.includes('markdown') || ext === 'md' || ext === 'markdown') {
    return 'markdown';
  }
  if (type.startsWith('text/') || ext === 'txt' || ext === 'text') {
    return 'text';
  }

  if (type.includes('word') || ext === 'doc' || ext === 'docx') {
    throw new UnsupportedFormatError('Word (à venir)');
  }
  if (type.includes('presentation') || ext === 'ppt' || ext === 'pptx') {
    throw new UnsupportedFormatError('PowerPoint (à venir)');
  }

  throw new UnsupportedFormatError(contentType ?? (ext === '' ? 'inconnu' : ext));
}
