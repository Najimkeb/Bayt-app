import { Scheduler } from '@bayt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/http/app.js';
import { InMemoryIngestionQueue } from '../../src/infrastructure/queue/cf-ingestion-queue.js';
import { InMemoryDocumentRepository } from '../../src/infrastructure/repositories/in-memory-document.repository.js';
import { InMemoryProgressRepository } from '../../src/infrastructure/repositories/in-memory-progress.repository.js';
import { InMemoryReviewRepository } from '../../src/infrastructure/repositories/in-memory-review.repository.js';
import { InMemoryDocumentStorage } from '../../src/infrastructure/storage/in-memory-document-storage.js';
import { authAs, bearerVerifier } from '../support/session.js';

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp({
    repository: new InMemoryReviewRepository(),
    progressRepository: new InMemoryProgressRepository(),
    documentRepository: new InMemoryDocumentRepository(),
    documentStorage: new InMemoryDocumentStorage(),
    ingestionQueue: new InMemoryIngestionQueue(),
    scheduler: new Scheduler(),
    // La vérification de session est pilotée par l'en-tête (pas de Better Auth
    // en test) : sans en-tête → pas de session → 401.
    sessionVerifier: bearerVerifier(),
  });
});

/** Dépose un document pour l'apprenant `userId`. */
function upload(userId: string): Promise<Response> {
  const form = new FormData();
  form.set('file', new File(['# Cours'], 'cours.md', { type: 'text/markdown' }));

  return Promise.resolve(
    app.request('/documents', { method: 'POST', body: form, headers: authAs(userId) }),
  );
}

describe('Garde d’authentification', () => {
  it('refuse (401) toute requête métier sans session', async () => {
    for (const path of ['/documents', '/reviews/queue', '/progress']) {
      expect((await app.request(path)).status).toBe(401);
    }
  });

  it('laisse passer la sonde de vie sans session', async () => {
    expect((await app.request('/health')).status).toBe(200);
  });

  it('accepte la même requête avec une session valide', async () => {
    const response = await app.request('/documents', { headers: authAs('alice') });
    expect(response.status).toBe(200);
  });
});

describe('Isolation des données entre apprenants', () => {
  it('un apprenant ne voit pas les documents d’un autre', async () => {
    const created = (await (await upload('alice')).json()) as { id: string };

    const bobList = (await (
      await app.request('/documents', { headers: authAs('bob') })
    ).json()) as { documents: unknown[] };
    expect(bobList.documents).toHaveLength(0);

    const aliceList = (await (
      await app.request('/documents', { headers: authAs('alice') })
    ).json()) as { documents: { id: string }[] };
    expect(aliceList.documents).toHaveLength(1);
    expect(aliceList.documents[0]?.id).toBe(created.id);
  });

  it('un apprenant ne peut ni lire ni supprimer le document d’un autre (404)', async () => {
    const created = (await (await upload('alice')).json()) as { id: string };

    // Bob : lecture, aperçu des cartes, suppression → tous 404.
    expect((await app.request(`/documents/${created.id}`, { headers: authAs('bob') })).status).toBe(
      404,
    );
    expect(
      (await app.request(`/documents/${created.id}/cards`, { headers: authAs('bob') })).status,
    ).toBe(404);
    expect(
      (await app.request(`/documents/${created.id}`, { method: 'DELETE', headers: authAs('bob') }))
        .status,
    ).toBe(404);

    // Le document d’Alice est intact : elle y accède toujours.
    expect(
      (await app.request(`/documents/${created.id}`, { headers: authAs('alice') })).status,
    ).toBe(200);
  });
});
