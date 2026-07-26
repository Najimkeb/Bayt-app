import { Scheduler } from '@bayt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/http/app.js';
import type { UserIdentity } from '../../src/application/ports/identity-repository.js';
import type { LLMProvider } from '../../src/ingestion/llm/provider.js';
import type { SearchDocument } from '../../src/ingestion/sourced/search-provider.js';
import { FakeWebSearchProvider } from '../../src/ingestion/sourced/fake-search.provider.js';
import { InMemoryIdentityRepository } from '../../src/infrastructure/repositories/in-memory-identity.repository.js';
import { InMemoryLessonDraftRepository } from '../../src/infrastructure/repositories/in-memory-lesson-draft.repository.js';
import { InMemoryReviewRepository } from '../../src/infrastructure/repositories/in-memory-review.repository.js';
import { authAs, bearerVerifier } from '../support/session.js';

const NOW = new Date('2026-03-15T12:00:00Z');
const ADMIN: UserIdentity = { id: 'admin1', name: 'Chef', email: 'a@bayt.app', role: 'admin', createdAt: 0 };
const MEMBER: UserIdentity = { id: 'user2', name: 'M', email: 'm@bayt.app', role: 'user', createdAt: 0 };

const DOCS: SearchDocument[] = [
  { url: 'https://www.cnil.fr/rgpd', title: 'CNIL', content: 'Le RGPD encadre le traitement depuis 2018.' },
];
const llm = (out: string): LLMProvider => ({ complete: () => Promise.resolve(out) });
const CARDS = JSON.stringify({
  cards: [
    { front: 'Depuis quand ?', back: '2018', sourceUrl: 'https://www.cnil.fr/rgpd', sourceExtract: 'Le RGPD encadre le traitement depuis 2018.' },
  ],
});

let drafts: InMemoryLessonDraftRepository;

function build(options: { search?: boolean } = {}) {
  drafts = new InMemoryLessonDraftRepository();

  return createApp({
    repository: new InMemoryReviewRepository(),
    identityRepository: new InMemoryIdentityRepository([ADMIN, MEMBER]),
    lessonDraftRepository: drafts,
    ...(options.search === false
      ? {}
      : { webSearchProvider: new FakeWebSearchProvider(DOCS), sourcedLlmProvider: llm(CARDS) }),
    scheduler: new Scheduler(),
    sessionVerifier: bearerVerifier(),
    clock: () => NOW,
  });
}

const post = (app: ReturnType<typeof build>, path: string, body: unknown, userId: string): Promise<Response> =>
  Promise.resolve(
    app.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authAs(userId) },
      body: JSON.stringify(body),
    }),
  );

let app: ReturnType<typeof build>;
beforeEach(() => {
  app = build();
});

describe('accès admin', () => {
  it('refuse un non-admin sur le studio (403)', async () => {
    const res = await app.request('/admin/lessons/drafts', { headers: authAs('user2') });
    expect(res.status).toBe(403);
  });

  it('laisse passer un admin', async () => {
    const res = await app.request('/admin/lessons/drafts', { headers: authAs('admin1') });
    expect(res.status).toBe(200);
  });
});

describe('génération sourcée', () => {
  it('génère un brouillon avec cartes sourcées + audit', async () => {
    const res = await post(app, '/admin/lessons/generate', { topic: 'RGPD', domainId: 'dom_rgpd', level: 'beginner' }, 'admin1');
    expect(res.status).toBe(201);

    const { draftId } = (await res.json()) as { draftId: string };
    const detail = (await (await app.request(`/admin/lessons/drafts/${draftId}`, { headers: authAs('admin1') })).json()) as {
      status: string;
      sensitive: boolean;
      cards: { sourceUrl: string; status: string }[];
    };
    expect(detail.status).toBe('draft');
    expect(detail.sensitive).toBe(true); // dom_rgpd = domaine sensible
    expect(detail.cards[0]?.sourceUrl).toBe('https://www.cnil.fr/rgpd');
    // Brouillon → rien en mémoire.
    expect(drafts.published).toHaveLength(0);
  });

  it('répond 501 quand la recherche web n’est pas configurée', async () => {
    const bare = build({ search: false });
    const res = await post(bare, '/admin/lessons/generate', { topic: 'x', domainId: 'dom_rgpd', level: 'beginner' }, 'admin1');
    expect(res.status).toBe(501);
  });
});

describe('publication', () => {
  it('publie uniquement les cartes validées', async () => {
    const gen = await post(app, '/admin/lessons/generate', { topic: 'RGPD', domainId: 'dom_rgpd', level: 'beginner' }, 'admin1');
    const { draftId } = (await gen.json()) as { draftId: string };

    const found = await drafts.findDraft(draftId);
    const cardId = found!.cards[0]!.id;

    // Sans validation : publie 0 carte.
    const empty = await post(app, `/admin/lessons/drafts/${draftId}/publish`, {}, 'admin1');
    expect(((await empty.json()) as { published: number }).published).toBe(0);
    expect(drafts.published).toHaveLength(0);

    // Valide puis publie : 1 carte entre en mémoire.
    await post(app, `/admin/lessons/drafts/${draftId}/cards/${cardId}/status`, { status: 'validated' }, 'admin1');
    const done = await post(app, `/admin/lessons/drafts/${draftId}/publish`, {}, 'admin1');
    expect(((await done.json()) as { published: number }).published).toBe(1);
    expect(drafts.published).toHaveLength(1);
  });
});

describe('génération de vocabulaire par fréquence', () => {
  const VOCAB = JSON.stringify({
    words: [
      { word: 'the', translation: 'le/la', category: 'article', example: 'The cat.', exampleTranslation: 'Le chat.' },
      { word: 'be', translation: 'être', category: 'verbe', example: 'To be here.', exampleTranslation: 'Être ici.' },
    ],
  });

  function buildVocab() {
    drafts = new InMemoryLessonDraftRepository();

    return createApp({
      repository: new InMemoryReviewRepository(),
      identityRepository: new InMemoryIdentityRepository([ADMIN, MEMBER]),
      lessonDraftRepository: drafts,
      sourcedLlmProvider: llm(VOCAB),
      scheduler: new Scheduler(),
      sessionVerifier: bearerVerifier(),
      clock: () => NOW,
    });
  }

  it('crée un brouillon de vocabulaire et renvoie le récap', async () => {
    const vocabApp = buildVocab();
    const res = await post(vocabApp, '/admin/lessons/vocabulary', { tranche: '1-100', domainId: 'dom_anglais', batchSize: 30 }, 'admin1');

    expect(res.status).toBe(201);
    const body = (await res.json()) as { draftId: string | null; created: number; batches: number };
    expect(body.created).toBe(2); // "the" et "be" (uniques)
    expect(body.batches).toBeGreaterThanOrEqual(1);
    expect(body.draftId).not.toBeNull();
  });

  it('refuse une tranche inconnue (400)', async () => {
    const vocabApp = buildVocab();
    const res = await post(vocabApp, '/admin/lessons/vocabulary', { tranche: '9-9', domainId: 'dom_anglais' }, 'admin1');
    expect(res.status).toBe(400);
  });

  it('refuse un non-admin (403)', async () => {
    const vocabApp = buildVocab();
    const res = await post(vocabApp, '/admin/lessons/vocabulary', { tranche: '1-100', domainId: 'dom_anglais' }, 'user2');
    expect(res.status).toBe(403);
  });
});
