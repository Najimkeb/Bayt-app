import { Scheduler } from '@bayt/domain';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/http/app.js';
import type { LLMProvider } from '../../src/ingestion/llm/provider.js';
import { InMemoryExplanationRepository } from '../../src/infrastructure/repositories/in-memory-explanation.repository.js';
import { InMemoryLessonDraftRepository } from '../../src/infrastructure/repositories/in-memory-lesson-draft.repository.js';
import { InMemoryReviewRepository, type SeedItem } from '../../src/infrastructure/repositories/in-memory-review.repository.js';
import { authAs, bearerVerifier } from '../support/session.js';

const NOW = new Date('2026-03-15T12:00:00Z');

/** Provider factice : renvoie l'évaluation demandée. */
const llm = (evaluation: object): LLMProvider => ({ complete: () => Promise.resolve(JSON.stringify(evaluation)) });

const CORRECT_EVAL = {
  score: 85,
  verdict: 'correct',
  strengths: ['Tu as bien saisi l’idée centrale.'],
  gaps: [],
  corrections: [],
  followUps: ['Peux-tu me donner un exemple concret ?'],
  reformulation: 'En clair, il s’agit de…',
};
const WRONG_EVAL = { ...CORRECT_EVAL, score: 20, verdict: 'erroneous', corrections: ['Attention, ce point est faux.'] };

let explanations: InMemoryExplanationRepository;
let drafts: InMemoryLessonDraftRepository;
let reviews: InMemoryReviewRepository;

function build(evaluation: object) {
  explanations = new InMemoryExplanationRepository();
  drafts = new InMemoryLessonDraftRepository();
  // Une carte existante pour tester le lien FSRS.
  const items: SeedItem[] = [
    { id: 'card1', type: 'flashcard', front: 'Q', back: 'R', domainId: 'dom_apprendre' },
  ];
  reviews = new InMemoryReviewRepository(items);

  return createApp({
    repository: reviews,
    explanationRepository: explanations,
    evaluationLlmProvider: llm(evaluation),
    lessonDraftRepository: drafts,
    scheduler: new Scheduler(),
    sessionVerifier: bearerVerifier(),
    clock: () => NOW,
  });
}

const post = (app: ReturnType<typeof build>, path: string, body: unknown): Promise<Response> =>
  Promise.resolve(
    app.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authAs('u1') },
      body: JSON.stringify(body),
    }),
  );

describe('POST /explanations', () => {
  it('évalue et, reliée à une carte, applique une note FSRS (bonne explication → replanifie)', async () => {
    const app = build(CORRECT_EVAL);
    const res = await post(app, '/explanations', { topic: 'RGPD', itemId: 'card1', explanation: 'Le RGPD protège les données personnelles.' });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { grade: string; review: { intervalMs: number } | null; evaluation: { verdict: string } };
    expect(body.grade).toBe('Good');
    expect(body.review).not.toBeNull();
    expect(body.review?.intervalMs).toBeGreaterThan(0);
    // Historique journalisé.
    expect(explanations.logs).toHaveLength(1);
    expect(explanations.logs[0]?.grade).toBe('Good');
  });

  it('une explication erronée → Again', async () => {
    const app = build(WRONG_EVAL);
    const res = await post(app, '/explanations', { topic: 'RGPD', itemId: 'card1', explanation: 'Le RGPD interdit internet.' });
    const body = (await res.json()) as { grade: string };
    expect(body.grade).toBe('Again');
  });

  it('sujet libre (sans carte) : évalue sans FSRS', async () => {
    const app = build(CORRECT_EVAL);
    const res = await post(app, '/explanations', { topic: 'Un sujet libre', explanation: 'Voici mon explication détaillée du sujet.' });
    const body = (await res.json()) as { review: unknown; grade: string };
    expect(body.review).toBeNull();
    expect(explanations.logs[0]?.itemId).toBeNull();
    expect(explanations.logs[0]?.grade).toBeNull();
  });

  it('rejette une explication trop courte (400)', async () => {
    const app = build(CORRECT_EVAL);
    expect((await post(app, '/explanations', { topic: 'RGPD', explanation: 'court' })).status).toBe(400);
  });
});

describe('GET /explanations (historique)', () => {
  it('renvoie l’historique de l’apprenant', async () => {
    const app = build(CORRECT_EVAL);
    await post(app, '/explanations', { topic: 'RGPD', itemId: 'card1', explanation: 'Le RGPD protège les données.' });

    const res = await app.request('/explanations', { headers: authAs('u1') });
    const body = (await res.json()) as { history: { topic: string; score: number }[] };
    expect(body.history).toHaveLength(1);
    expect(body.history[0]?.topic).toBe('RGPD');
    expect(body.history[0]?.score).toBe(85);
  });
});

describe('POST /explanations/draft (sujet libre → studio)', () => {
  it('crée un brouillon non publié', async () => {
    const app = build(CORRECT_EVAL);
    const res = await post(app, '/explanations/draft', {
      topic: 'Mon concept',
      reformulation: 'La bonne formulation.',
      explanation: 'Mon explication personnelle du concept.',
      domainId: 'dom_apprendre',
    });
    expect(res.status).toBe(201);

    const { draftId } = (await res.json()) as { draftId: string };
    const found = await drafts.findDraft(draftId);
    expect(found?.draft.status).toBe('draft');
    expect(found?.cards).toHaveLength(1);
    // Rien n'entre en mémoire tant que non publié.
    expect(drafts.published).toHaveLength(0);
  });
});

describe('sans dépendances', () => {
  it('ne monte pas /explanations si évaluateur absent', async () => {
    const app = createApp({
      repository: new InMemoryReviewRepository(),
      scheduler: new Scheduler(),
      sessionVerifier: bearerVerifier(),
    });
    expect((await post(app, '/explanations', { topic: 'x', explanation: 'yyyyyyyyyy' })).status).toBe(404);
  });
});
