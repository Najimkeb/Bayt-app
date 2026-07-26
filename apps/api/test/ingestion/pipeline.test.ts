import { beforeEach, describe, expect, it } from 'vitest';

import { IngestDocument } from '../../src/application/use-cases/ingest-document.js';
import { SubmitDocument } from '../../src/application/use-cases/submit-document.js';
import { CardGenerator } from '../../src/ingestion/card-generator.js';
import { UnsupportedFormatError } from '../../src/ingestion/format.js';
import type { LLMProvider } from '../../src/ingestion/llm/provider.js';
import { InMemoryIngestionQueue } from '../../src/infrastructure/queue/cf-ingestion-queue.js';
import { InMemoryDocumentRepository } from '../../src/infrastructure/repositories/in-memory-document.repository.js';
import { InMemoryDocumentStorage } from '../../src/infrastructure/storage/in-memory-document-storage.js';

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
let storage: InMemoryDocumentStorage;
let queue: InMemoryIngestionQueue;
let submit: SubmitDocument;
let ingest: IngestDocument;
let idCounter: number;

beforeEach(() => {
  docs = new InMemoryDocumentRepository();
  storage = new InMemoryDocumentStorage();
  queue = new InMemoryIngestionQueue();
  idCounter = 0;
  const nextId = (): string => `id-${String(idCounter++)}`;

  submit = new SubmitDocument(docs, storage, queue, () => NOW, nextId);
  ingest = new IngestDocument(docs, storage, new CardGenerator(provider()), () => NOW, nextId);
});

describe('SubmitDocument', () => {
  it('extrait le texte, crée le document (pending), le stocke et met en file', async () => {
    const doc = await submit.execute({
      userId: 'demo',
      filename: 'cours.md',
      contentType: 'text/markdown',
      bytes: encode('# Cours\n\nContenu.'),
      domainId: null,
    });

    expect(doc.status).toBe('pending');
    expect(doc.format).toBe('markdown');
    // La file ne transporte que l'id (pas le texte).
    expect(queue.sent).toEqual([{ documentId: doc.id }]);
    // Le texte extrait est stocké, relisible par le consumer via l'id.
    await expect(storage.get(doc.id)).resolves.toContain('Contenu.');
  });

  it('refuse un format non pris en charge', async () => {
    await expect(
      submit.execute({
        userId: 'demo',
        filename: 'slides.pptx',
        contentType: 'application/vnd.ms-powerpoint',
        bytes: encode('x'),
        domainId: null,
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
      domainId: null,
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

  it('passe en failed avec motif si le texte extrait est absent en base', async () => {
    const doc = await submit.execute({
      userId: 'demo',
      filename: 'cours.txt',
      contentType: 'text/plain',
      bytes: encode('contenu'),
      domainId: null,
    });

    // On simule un texte manquant en donnant au consumer un stockage vide.
    const empty = new InMemoryDocumentStorage();
    const brokenIngest = new IngestDocument(docs, empty, new CardGenerator(provider()), () => NOW);

    await brokenIngest.execute(doc.id);

    const updated = await docs.findById(doc.id);
    expect(updated?.status).toBe('failed');
    expect(updated?.error).toContain('introuvable');
  });

  it('ne fait rien pour un document inconnu', async () => {
    await expect(ingest.execute('inexistant')).resolves.toBeUndefined();
  });

  it('persiste TOUTES les cartes d’un gros document (40+) sans en perdre', async () => {
    // Provider renvoyant 6 cartes UNIQUES par appel (une par section) : de quoi
    // dépasser largement une seule requête d'insert (chunking obligatoire).
    let n = 0;
    const many: LLMProvider = {
      complete: () => {
        const cards = Array.from({ length: 6 }, () => {
          n += 1;
          return { front: `Question ${String(n)} ?`, back: `Réponse ${String(n)}.` };
        });

        return Promise.resolve(JSON.stringify({ cards }));
      },
    };
    // ~10 sections (texte long) → ~60 cartes générées, plafonnées à 40.
    const paragraph = 'Le rappel actif renforce durablement la mémoire à long terme. '.repeat(20);
    const longText = Array.from({ length: 10 }, (_v, i) => `Section ${String(i)}. ${paragraph}`).join('\n\n');

    const doc = await submit.execute({
      userId: 'demo',
      filename: 'gros.md',
      contentType: 'text/markdown',
      bytes: encode(longText),
      domainId: 'dom_apprendre',
    });

    const bigIngest = new IngestDocument(docs, storage, new CardGenerator(many), () => NOW, () =>
      `card-${String(idCounter++)}`,
    );
    await bigIngest.execute(doc.id);

    const updated = await docs.findById(doc.id);
    expect(updated?.status).toBe('ready');
    // Plafond du pipeline = 40 cartes.
    expect(updated?.cardCount).toBe(40);
    // Le compte réellement enregistré correspond au statut.
    expect(docs.itemsForSource(`doc:${doc.id}`)).toHaveLength(40);
  });
});
