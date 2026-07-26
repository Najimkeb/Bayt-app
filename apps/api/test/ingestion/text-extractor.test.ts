import { describe, expect, it } from 'vitest';

import { ExtractionError, extractText } from '../../src/ingestion/text-extractor.js';

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('extractText', () => {
  it('décode le texte brut et le Markdown en UTF-8', async () => {
    await expect(extractText(encode('Bonjour à toi'), 'text')).resolves.toBe('Bonjour à toi');
    await expect(extractText(encode('# Titre\n\nCorps'), 'markdown')).resolves.toBe(
      '# Titre\n\nCorps',
    );
  });

  // L'extraction PDF réelle (unpdf) est couverte par `pdf-extraction.test.ts`
  // avec de vrais PDF ; ici on vérifie seulement le repli d'échec propre.
  it('échoue proprement si le PDF ne contient pas de texte exploitable', async () => {
    await expect(extractText(encode('%PDF-1.4\n%%EOF'), 'pdf')).rejects.toBeInstanceOf(
      ExtractionError,
    );
  });

  it('signale les formats pas encore implémentés', async () => {
    await expect(extractText(encode('x'), 'word')).rejects.toBeInstanceOf(ExtractionError);
  });
});
