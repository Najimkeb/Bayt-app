/**
 * Découpage d'un texte en sections cohérentes, pour alimenter l'agent de
 * génération section par section. Pur et déterministe.
 *
 * Règles :
 * - on respecte les paragraphes (séparés par une ligne vide) ;
 * - un titre Markdown (`#`…) ouvre une nouvelle section ;
 * - une section ne dépasse pas `maxChars` (un paragraphe trop long est coupé
 *   sur les fins de phrase).
 */
export interface ChunkOptions {
  readonly maxChars?: number;
}

const DEFAULT_MAX_CHARS = 1500;

const isHeading = (paragraph: string): boolean => /^#{1,6}\s/.test(paragraph);

/** Coupe un paragraphe trop long en morceaux <= maxChars, sur les phrases. */
function hardSplit(paragraph: string, maxChars: number): string[] {
  const sentences = paragraph.split(/(?<=[.!?…])\s+/);
  const pieces: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      // Phrase démesurée : découpe brute par tranches.
      if (current) {
        pieces.push(current);
        current = '';
      }
      for (let i = 0; i < sentence.length; i += maxChars) {
        pieces.push(sentence.slice(i, i + maxChars));
      }
      continue;
    }

    if (current && current.length + 1 + sentence.length > maxChars) {
      pieces.push(current);
      current = '';
    }
    current = current ? `${current} ${sentence}` : sentence;
  }

  if (current) {
    pieces.push(current);
  }

  return pieces;
}

export function splitIntoSections(text: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const normalized = text.replace(/\r\n?/g, '\n').trim();

  if (normalized === '') {
    return [];
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');

  const sections: string[] = [];
  let current = '';

  const flush = (): void => {
    if (current !== '') {
      sections.push(current);
      current = '';
    }
  };

  for (const paragraph of paragraphs) {
    if (current !== '' && (isHeading(paragraph) || current.length + 2 + paragraph.length > maxChars)) {
      flush();
    }

    if (paragraph.length > maxChars) {
      flush();
      sections.push(...hardSplit(paragraph, maxChars));
      continue;
    }

    current = current === '' ? paragraph : `${current}\n\n${paragraph}`;
  }

  flush();

  return sections;
}
