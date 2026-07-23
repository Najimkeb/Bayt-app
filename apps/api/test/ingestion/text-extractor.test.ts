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

  it('extrait le texte d\'un PDF non compressé (opérateurs Tj)', async () => {
    // PDF minimal avec un flux de contenu non compressé et deux chaînes.
    const pdf = [
      '%PDF-1.4',
      '1 0 obj << /Length 60 >>',
      'stream',
      'BT /F1 12 Tf (La memoire longue duree) Tj (se construit par le rappel) Tj ET',
      'endstream',
      'endobj',
      '%%EOF',
    ].join('\n');

    const text = await extractText(encode(pdf), 'pdf');

    expect(text).toContain('La memoire longue duree');
    expect(text).toContain('se construit par le rappel');
  });

  it('échoue proprement si le PDF ne contient pas de texte exploitable', async () => {
    await expect(extractText(encode('%PDF-1.4\n%%EOF'), 'pdf')).rejects.toBeInstanceOf(
      ExtractionError,
    );
  });

  it('signale les formats pas encore implémentés', async () => {
    await expect(extractText(encode('x'), 'word')).rejects.toBeInstanceOf(ExtractionError);
  });
});
