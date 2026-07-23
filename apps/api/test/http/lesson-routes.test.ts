import { Scheduler, type Lesson } from '@bayt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import type { LearningItemView } from '../../src/application/ports/review-repository.js';
import { createApp } from '../../src/http/app.js';
import { InMemoryLessonRepository } from '../../src/infrastructure/repositories/in-memory-lesson.repository.js';
import { InMemoryReviewRepository } from '../../src/infrastructure/repositories/in-memory-review.repository.js';

const ITEMS: readonly LearningItemView[] = [
  { id: 'i-mcq', type: 'flashcard', front: 'q', back: 'D1' },
  { id: 'i-match', type: 'flashcard', front: 'q', back: '…' },
];

const LESSON: Lesson = {
  id: 'l1',
  title: 'Fondamentaux',
  exercises: [
    {
      id: 'x-mcq',
      itemId: 'i-mcq',
      type: 'mcq',
      prompt: 'Base SQL de Cloudflare ?',
      options: ['R2', 'D1', 'KV'],
      answerIndex: 1,
    },
    {
      id: 'x-match',
      itemId: 'i-match',
      type: 'matching',
      prompt: 'Associe.',
      pairs: [
        { left: 'Stabilité', right: 'Durée avant oubli' },
        { left: 'Difficulté', right: 'Résistance' },
      ],
    },
  ],
};

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp({
    repository: new InMemoryReviewRepository(ITEMS),
    lessonRepository: new InMemoryLessonRepository([LESSON]),
    scheduler: new Scheduler(),
    clock: () => new Date('2026-03-01T09:00:00.000Z'),
  });
});

describe('GET /lessons/:id', () => {
  it('renvoie la leçon et ses exercices', async () => {
    const response = await app.request('/lessons/l1');

    expect(response.status).toBe(200);
    const body = (await response.json()) as { title: string; exercises: unknown[] };
    expect(body.title).toBe('Fondamentaux');
    expect(body.exercises).toHaveLength(2);
  });

  it('NE divulgue JAMAIS les solutions', async () => {
    const raw = await (await app.request('/lessons/l1')).text();

    // Ni la clé answerIndex, ni le texte de la bonne réponse, ni l'appariement.
    expect(raw).not.toContain('answerIndex');
    expect(raw).not.toContain('answer');
    // Le QCM garde ses options (dont la bonne, noyée) mais pas l'index.
    const body = JSON.parse(raw) as { exercises: { type: string; options?: string[] }[] };
    const mcq = body.exercises.find((e) => e.type === 'mcq');
    expect(mcq?.options).toEqual(['R2', 'D1', 'KV']);
    expect(mcq).not.toHaveProperty('answerIndex');
  });

  it('présente une association avec côtés gauche/droit et identifiants', async () => {
    const body = (await (await app.request('/lessons/l1')).json()) as {
      exercises: {
        type: string;
        lefts?: { id: string }[];
        rights?: { id: string }[];
      }[];
    };
    const match = body.exercises.find((e) => e.type === 'matching');

    expect(match?.lefts?.map((s) => s.id)).toEqual(['L0', 'L1']);
    expect(match?.rights?.map((s) => s.id).sort()).toEqual(['R0', 'R1']);
  });

  it('renvoie 404 sur une leçon inconnue', async () => {
    expect((await app.request('/lessons/nope')).status).toBe(404);
  });
});

describe('POST /lessons/:id/answers', () => {
  const answer = (payload: unknown): Promise<Response> =>
    Promise.resolve(
      app.request('/lessons/l1/answers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );

  it('bonne réponse → correct + correction + révision', async () => {
    const response = await answer({
      userId: 'demo',
      exerciseId: 'x-mcq',
      answer: { kind: 'mcq', choice: 1 },
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      correct: boolean;
      grade: string;
      correction: { answerText: string };
      intervalMs: number;
    };
    expect(body.correct).toBe(true);
    expect(body.grade).toBe('Good');
    expect(body.correction.answerText).toBe('D1');
    expect(body.intervalMs).toBeGreaterThan(0);
  });

  it('mauvaise réponse → correct=false, grade Again, correction fournie', async () => {
    const body = (await (
      await answer({ userId: 'demo', exerciseId: 'x-mcq', answer: { kind: 'mcq', choice: 0 } })
    ).json()) as { correct: boolean; grade: string };

    expect(body.correct).toBe(false);
    expect(body.grade).toBe('Again');
  });

  it('valide le corps (zod) : 400 si malformé', async () => {
    expect((await answer({ userId: 'demo', exerciseId: 'x-mcq' })).status).toBe(400);
    expect((await answer({ exerciseId: 'x-mcq', answer: { kind: 'mcq', choice: 1 } })).status).toBe(
      400,
    );
  });

  it('404 sur un exercice inconnu', async () => {
    const response = await answer({
      userId: 'demo',
      exerciseId: 'x-nope',
      answer: { kind: 'mcq', choice: 1 },
    });

    expect(response.status).toBe(404);
  });
});

describe('sans lessonRepository', () => {
  it('ne monte pas les routes /lessons', async () => {
    const bare = createApp({
      repository: new InMemoryReviewRepository(ITEMS),
      scheduler: new Scheduler(),
    });

    expect((await bare.request('/lessons/l1')).status).toBe(404);
  });
});
