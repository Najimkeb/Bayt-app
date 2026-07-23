import { beforeEach, describe, expect, it } from 'vitest';

import { IngestDocument } from '../../src/application/use-cases/ingest-document.js';
import { SubmitDocument } from '../../src/application/use-cases/submit-document.js';
import { CardGenerator } from '../../src/ingestion/card-generator.js';
import { UnsupportedFormatError } from '../../src/ingestion/format.js';
import type { LLMProvider } from '../../src/ingestion/llm/provider.js';
import { InMemoryIngestionQueue } from '../../src/infrastructure/queue/cf-ingestion-queue.js';
import { InMemoryDocumentRepository } from '../../src/infrastructure/repositories/in-memory-document.repository.js';
import { InMemoryObjectStorage } from '../../src/infrastructure/storage/in-memory-object-storage.js';

const NOW = new Date('2026-03-01T12:00:00Z');
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

/** Provider factice renvoyant deux cartes valides. */
const provider = (): LLMProvider => ({
  complete: () =>
    Promise.resolve(
      JSON.stringify({
        cards: [
          { front: 'Question A ?', back: 'Réponse A.' },
          { front: 'Question B ?', back: 'Réponse B.' },
        ],
      }),
    ),
});

let docs: InMemoryDocumentRepository;
let storage: InMemoryObjectStorage;
let queue: InMemoryIngestionQueue;
let submit: SubmitDocument;
let ingest: IngestDocument;
let idCounter: number;

beforeEach(() => {
  docs = new InMemoryDocumentRepository();
  storage = new InMemoryObjectStorage();
  queue = new InMemoryIngestionQueue();
  idCounter = 0;
  const nextId = (): string => `id-${String(idCounter++)}`;

  submit = new SubmitDocument(docs, storage, queue, () => NOW, nextId);
  ingest = new IngestDocument(docs, storage, new CardGenerator(provider()), () => NOW, nextId);
});

describe('SubmitDocument', () => {
  it('stocke le fichier, crée le document (pending) et met en file', async () => {
    const doc = await submit.execute({
      userId: 'demo',
      filename: 'cours.md',
      contentType: 'text/markdown',
      bytes: encode('# Cours\n\nContenu.'),
    });

    expect(doc.status).toBe('pending');
    expect(doc.format).toBe('markdown');
    expect(queue.sent).toEqual([{ documentId: doc.id }]);
    await expect(storage.get(doc.r2Key)).resolves.not.toBeNull();
  });

  it('refuse un format non pris en charge', async () => {
    await expect(
      submit.execute({
        userId: 'demo',
        filename: 'slides.pptx',
        contentType: 'application/vnd.ms-powerpoint',
        bytes: encode('x'),
      }),
    ).rejects.toBeInstanceOf(UnsupportedFormatError);
  });
});

describe('IngestDocument (consumer)', () => {
  it('traite un document et le passe en ready avec ses cartes', async () => {
    const doc = await submit.execute({
      userId: 'demo',
      filename: 'cours.md',
      contentType: 'text/markdown',
      bytes: encode('# Mémoire\n\nLe rappel actif renforce la mémoire à long terme.'),
    });

    await ingest.execute(doc.id);

    const updated = await docs.findById(doc.id);
    expect(updated?.status).toBe('ready');
    expect(updated?.cardCount).toBe(2);

    const items = docs.itemsForSource(`doc:${doc.id}`);
    expect(items).toHaveLength(2);
    expect(items[0]?.type).toBe('flashcard');
    expect(items[0]?.sourceRef).toBe(`doc:${doc.id}`);
  });

  it('passe en failed avec motif si le fichier est absent de R2', async () => {
    const doc = await submit.execute({
      userId: 'demo',
      filename: 'cours.txt',
      contentType: 'text/plain',
      bytes: encode('contenu'),
    });

    // On simule un objet manquant en vidant le stockage.
    const empty = new InMemoryObjectStorage();
    const brokenIngest = new IngestDocument(docs, empty, new CardGenerator(provider()), () => NOW);

    await brokenIngest.execute(doc.id);

    const updated = await docs.findById(doc.id);
    expect(updated?.status).toBe('failed');
    expect(updated?.error).toContain('R2');
  });

  it('ne fait rien pour un document inconnu', async () => {
    await expect(ingest.execute('inexistant')).resolves.toBeUndefined();
  });
});
