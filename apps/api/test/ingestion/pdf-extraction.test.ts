import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { IngestDocument } from '../../src/application/use-cases/ingest-document.js';
import { SubmitDocument } from '../../src/application/use-cases/submit-document.js';
import { CardGenerator } from '../../src/ingestion/card-generator.js';
import type { LLMProvider } from '../../src/ingestion/llm/provider.js';
import { ExtractionError, extractText } from '../../src/ingestion/text-extractor.js';
import { InMemoryIngestionQueue } from '../../src/infrastructure/queue/cf-ingestion-queue.js';
import { InMemoryDocumentRepository } from '../../src/infrastructure/repositories/in-memory-document.repository.js';
import { InMemoryDocumentStorage } from '../../src/infrastructure/storage/in-memory-document-storage.js';

/** Génère un vrai PDF texte (plusieurs lignes, façon bandeau + paragraphe). */
async function textPdf(lines: readonly string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  let y = 800;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 13, font });
    y -= 22;
  }

  return doc.save();
}

/** Génère un PDF SANS couche texte (page vide) — simule un scan. */
async function blankPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]);

  return doc.save();
}

const CONTENT = [
  'BAYT — Fondamentaux de la mémorisation',
  'La répétition espacée consiste à revoir une information à intervalles croissants.',
  'Le rappel actif force le cerveau à récupérer l’information, ce qui consolide la trace.',
  'FSRS estime la stabilité et la difficulté d’une carte pour planifier la prochaine révision.',
  'Une bonne carte porte une seule idée et pose une question de rappel.',
];

describe('extractText (PDF via unpdf)', () => {
  it('extrait correctement le texte d’un PDF multi-lignes', async () => {
    const bytes = await textPdf(CONTENT);
    const text = await extractText(bytes, 'pdf');

    expect(text).toContain('répétition espacée');
    expect(text).toContain('rappel actif');
    expect(text).toContain('FSRS');
    expect(text.replace(/\s+/g, '').length).toBeGreaterThan(100);
  });

  it('un PDF sans couche texte (scanné) échoue avec un motif clair', async () => {
    const bytes = await blankPdf();

    await expect(extractText(bytes, 'pdf')).rejects.toBeInstanceOf(ExtractionError);
    await expect(extractText(bytes, 'pdf')).rejects.toThrow(/scanné ou protégé/);
  });

  it('un PDF corrompu échoue proprement (jamais un texte vide silencieux)', async () => {
    const garbage = new TextEncoder().encode('%PDF-1.4 ceci n’est pas un vrai PDF');

    await expect(extractText(garbage, 'pdf')).rejects.toBeInstanceOf(ExtractionError);
  });
});

const NOW = new Date('2026-03-01T12:00:00Z');
const twoCards: LLMProvider = {
  complete: () =>
    Promise.resolve(JSON.stringify({ cards: [{ front: 'Q1 ?', back: 'R1.' }, { front: 'Q2 ?', back: 'R2.' }] })),
};
const noCards: LLMProvider = { complete: () => Promise.resolve(JSON.stringify({ cards: [] })) };

function pipeline(provider: LLMProvider) {
  const docs = new InMemoryDocumentRepository();
  const storage = new InMemoryDocumentStorage();
  const queue = new InMemoryIngestionQueue();
  let n = 0;
  const nextId = (): string => `id-${String(n++)}`;
  const submit = new SubmitDocument(docs, storage, queue, () => NOW, nextId);
  const ingest = new IngestDocument(docs, storage, new CardGenerator(provider), () => NOW, nextId);

  return { docs, storage, queue, submit, ingest };
}

const upload = (bytes: Uint8Array, filename = 'doc.pdf') => ({
  userId: 'u1',
  filename,
  contentType: 'application/pdf',
  bytes,
  domainId: null,
});

describe('pipeline PDF — jamais « ready » à 0 carte', () => {
  it('un PDF texte normal produit des cartes (ready)', async () => {
    const { submit, ingest, docs } = pipeline(twoCards);
    const doc = await submit.execute(upload(await textPdf(CONTENT)));
    expect(doc.status).toBe('pending');

    await ingest.execute(doc.id);
    const updated = await docs.findById(doc.id);
    expect(updated?.status).toBe('ready');
    expect(updated?.cardCount).toBe(2);
  });

  it('un PDF scanné finit en failed AVANT la file (motif clair), jamais ready', async () => {
    const { submit, queue } = pipeline(twoCards);
    const doc = await submit.execute(upload(await blankPdf(), 'scan.pdf'));

    expect(doc.status).toBe('failed');
    expect(doc.error).toMatch(/scanné ou protégé/);
    // Rien n'est mis en file : pas de traitement, pas de « ready » à 0.
    expect(queue.sent).toHaveLength(0);
  });

  it('du texte mais 0 carte générée → failed (jamais ready à 0)', async () => {
    const { submit, ingest, docs } = pipeline(noCards);
    const doc = await submit.execute(upload(await textPdf(CONTENT)));
    expect(doc.status).toBe('pending');

    await ingest.execute(doc.id);
    const updated = await docs.findById(doc.id);
    expect(updated?.status).toBe('failed');
    expect(updated?.error).toMatch(/Aucune carte/);
    expect(updated?.cardCount).toBe(0);
  });
});
