import { extractText as extractPdf, getDocumentProxy } from 'unpdf';

import type { DocumentFormat } from './format.js';

/**
 * Extraction du texte d'un document.
 *
 * - texte / Markdown : décodage UTF-8 direct ;
 * - PDF : extraction robuste via **unpdf** (build serverless de PDF.js, sans
 *   dépendance native — fonctionne dans un Worker edge). Gère le multi-pages et
 *   le texte réparti sur la page (bandeaux, tableaux).
 *
 * **Ne réussit jamais en silence** : un PDF scanné/protégé (ou dont l'extraction
 * ne rend quasi rien) lève `ExtractionError` avec un motif clair, plutôt que de
 * renvoyer un texte vide qui donnerait « ready avec 0 carte » plus loin.
 *
 * Point d'extension : Word / PowerPoint viendront s'ajouter dans le `switch`.
 */

/** Erreur : extraction impossible (format non géré, PDF sans texte…). */
export class ExtractionError extends Error {
  public override readonly name = 'ExtractionError';
}

/**
 * Seuil de « texte utile » (caractères hors espaces) sous lequel on considère
 * l'extraction comme un échec — typiquement un PDF scanné (image sans couche
 * texte) ou protégé.
 */
const MIN_USEFUL_CHARS = 100;

/** Motif utilisateur pour un PDF dont on ne peut rien extraire. */
const SCANNED_OR_PROTECTED =
  'Impossible d’extraire le texte de ce PDF — il est peut-être scanné ou protégé.';

export async function extractText(bytes: Uint8Array, format: DocumentFormat): Promise<string> {
  switch (format) {
    case 'text':
    case 'markdown':
      return new TextDecoder('utf-8').decode(bytes);

    case 'pdf':
      return extractPdfText(bytes);

    case 'word':
    case 'powerpoint':
      throw new ExtractionError(`Extraction ${format} pas encore implémentée`);
  }
}

/** Nombre de caractères « utiles » (hors espaces) — mesure la matière réelle. */
function usefulLength(text: string): number {
  return text.replace(/\s+/g, '').length;
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  let merged: string;

  try {
    // Copie dans un buffer net : unpdf/PDF.js peut consommer le tampon.
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractPdf(pdf, { mergePages: true });
    // `mergePages: true` → chaîne unique ; on reste défensif si un tableau sort.
    merged = Array.isArray(text) ? text.join('\n') : text;
  } catch {
    // PDF corrompu, chiffré, ou illisible par PDF.js → motif clair, pas de silence.
    throw new ExtractionError(SCANNED_OR_PROTECTED);
  }

  const normalized = merged.replace(/[ \t]{2,}/g, ' ').trim();

  // PDF scanné / sans couche texte : PDF.js rend (quasi) rien → échec explicite.
  if (usefulLength(normalized) < MIN_USEFUL_CHARS) {
    throw new ExtractionError(SCANNED_OR_PROTECTED);
  }

  return normalized;
}
