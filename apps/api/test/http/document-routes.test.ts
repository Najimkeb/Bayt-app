import { Scheduler } from '@bayt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/http/app.js';
import { InMemoryIngestionQueue } from '../../src/infrastructure/queue/cf-ingestion-queue.js';
import { InMemoryDocumentRepository } from '../../src/infrastructure/repositories/in-memory-document.repository.js';
import { InMemoryReviewRepository } from '../../src/infrastructure/repositories/in-memory-review.repository.js';
import { InMemoryDocumentStorage } from '../../src/infrastructure/storage/in-memory-document-storage.js';
import { alwaysUser } from '../support/session.js';

let docs: InMemoryDocumentRepository;
let queue: InMemoryIngestionQueue;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  docs = new InMemoryDocumentRepository();
  queue = new InMemoryIngestionQueue();
  app = createApp({
    repository: new InMemoryReviewRepository(),
    documentRepository: docs,
    documentStorage: new InMemoryDocumentStorage(),
    ingestionQueue: queue,
    scheduler: new Scheduler(),
    sessionVerifier: alwaysUser('demo'),
    clock: () => new Date('2026-03-01T12:00:00Z'),
  });
});

/** Envoie un fichier en multipart. */
function upload(filename: string, type: string, content: string): Promise<Response> {
  const form = new FormData();
  form.set('file', new File([content], filename, { type }));
  form.set('userId', 'demo');

  return Promise.resolve(app.request('/documents', { method: 'POST', body: form }));
}

describe('POST /documents', () => {
  it('accepte un document et répond 202 (pending) + met en file', async () => {
    const response = await upload('cours.md', 'text/markdown', '# Cours\n\nContenu.');

    expect(response.status).toBe(202);
    const body = (await response.json()) as { id: string; status: string; format: string };
    expect(body.status).toBe('pending');
    expect(body.format).toBe('markdown');
    expect(queue.sent).toEqual([{ kind: 'ingest', documentId: body.id }]);
  });

  it('refuse un format non pris en charge (415)', async () => {
    const response = await upload('slides.pptx', 'application/vnd.ms-powerpoint', 'x');
    expect(response.status).toBe(415);
  });

  it('rejette une requête sans fichier (400)', async () => {
    const form = new FormData();
    form.set('userId', 'demo');
    const response = await app.request('/documents', { method: 'POST', body: form });
    expect(response.status).toBe(400);
  });
});

describe('GET /documents et /documents/:id', () => {
  it('liste les documents de l\'apprenant', async () => {
    await upload('a.txt', 'text/plain', 'contenu a');
    await upload('b.md', 'text/markdown', 'contenu b');

    const body = (await (await app.request('/documents?userId=demo')).json()) as {
      documents: { filename: string }[];
    };

    expect(body.documents).toHaveLength(2);
  });

  it('renvoie le statut d\'un document précis', async () => {
    const created = (await (await upload('a.txt', 'text/plain', 'contenu')).json()) as {
      id: string;
    };

    const response = await app.request(`/documents/${created.id}`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; status: string };
    expect(body.id).toBe(created.id);
  });

  it('renvoie 404 pour un document inconnu', async () => {
    expect((await app.request('/documents/inconnu')).status).toBe(404);
  });
});

describe('GET /documents/:id/cards', () => {
  it('renvoie les cartes générées (recto/verso) du document', async () => {
    const created = (await (await upload('a.md', 'text/markdown', '# Cours')).json()) as {
      id: string;
    };

    // Simule ce que le consumer écrit après traitement.
    await docs.replaceLearningItems(`doc:${created.id}`, [
      { id: 'c1', type: 'flashcard', front: 'Q1', back: 'R1', sourceRef: `doc:${created.id}`, domainId: null, createdAt: 1 },
      { id: 'c2', type: 'flashcard', front: 'Q2', back: 'R2', sourceRef: `doc:${created.id}`, domainId: null, createdAt: 2 },
    ]);

    const response = await app.request(`/documents/${created.id}/cards`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { cards: { front: string; back: string }[] };
    expect(body.cards).toEqual([
      { id: 'c1', front: 'Q1', back: 'R1' },
      { id: 'c2', front: 'Q2', back: 'R2' },
    ]);
  });

  it('renvoie 404 pour un document inconnu', async () => {
    expect((await app.request('/documents/inconnu/cards')).status).toBe(404);
  });
});

describe('DELETE /documents/:id', () => {
  it('supprime le document et ses cartes (204)', async () => {
    const created = (await (await upload('a.md', 'text/markdown', '# Cours')).json()) as {
      id: string;
    };
    await docs.replaceLearningItems(`doc:${created.id}`, [
      { id: 'c1', type: 'flashcard', front: 'Q', back: 'R', sourceRef: `doc:${created.id}`, domainId: null, createdAt: 1 },
    ]);

    const response = await app.request(`/documents/${created.id}`, { method: 'DELETE' });
    expect(response.status).toBe(204);

    // Document et cartes ont bien disparu.
    expect((await app.request(`/documents/${created.id}`)).status).toBe(404);
    expect(await docs.itemsForSource(`doc:${created.id}`)).toHaveLength(0);
  });

  it('renvoie 404 pour un document déjà absent', async () => {
    expect((await app.request('/documents/inconnu', { method: 'DELETE' })).status).toBe(404);
  });
});

describe('sans dépendances d\'ingestion', () => {
  it('ne monte pas les routes /documents', async () => {
    const bare = createApp({
      repository: new InMemoryReviewRepository(),
      scheduler: new Scheduler(),
      sessionVerifier: alwaysUser('demo'),
    });

    expect((await bare.request('/documents')).status).toBe(404);
  });
});
