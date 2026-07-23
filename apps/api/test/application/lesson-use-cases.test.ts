import { Scheduler, type Lesson } from '@bayt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import { ExerciseNotFoundError, LessonNotFoundError } from '../../src/application/errors.js';
import type { LearningItemView } from '../../src/application/ports/review-repository.js';
import { GetLesson } from '../../src/application/use-cases/get-lesson.js';
import { SubmitExerciseAnswer } from '../../src/application/use-cases/submit-exercise-answer.js';
import { SubmitReview } from '../../src/application/use-cases/submit-review.js';
import { InMemoryLessonRepository } from '../../src/infrastructure/repositories/in-memory-lesson.repository.js';
import { InMemoryReviewRepository } from '../../src/infrastructure/repositories/in-memory-review.repository.js';

const USER = 'demo';
const NOW = new Date('2026-03-01T09:00:00.000Z');

const ITEMS: readonly LearningItemView[] = [
  { id: 'i-mcq', type: 'flashcard', front: 'q', back: 'D1' },
  { id: 'i-fill', type: 'flashcard', front: 'q', back: 'Ebbinghaus' },
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
      id: 'x-fill',
      itemId: 'i-fill',
      type: 'fill_blank',
      prompt: "L'oubli fut décrit par ___.",
      answer: 'Ebbinghaus',
    },
  ],
};

const scheduler = new Scheduler();

let reviewRepo: InMemoryReviewRepository;
let lessonRepo: InMemoryLessonRepository;
let getLesson: GetLesson;
let submitAnswer: SubmitExerciseAnswer;

beforeEach(() => {
  reviewRepo = new InMemoryReviewRepository(ITEMS);
  lessonRepo = new InMemoryLessonRepository([LESSON]);
  getLesson = new GetLesson(lessonRepo);
  submitAnswer = new SubmitExerciseAnswer(lessonRepo, new SubmitReview(reviewRepo, scheduler));
});

describe('GetLesson', () => {
  it('renvoie la leçon complète', async () => {
    const lesson = await getLesson.execute('l1');

    expect(lesson.title).toBe('Fondamentaux');
    expect(lesson.exercises).toHaveLength(2);
  });

  it('lève sur une leçon inconnue', async () => {
    await expect(getLesson.execute('nope')).rejects.toThrow(LessonNotFoundError);
  });
});

describe('SubmitExerciseAnswer', () => {
  it('bonne réponse du premier coup → Good + révision enregistrée', async () => {
    const result = await submitAnswer.execute({
      userId: USER,
      lessonId: 'l1',
      exerciseId: 'x-mcq',
      answer: { kind: 'mcq', choice: 1 },
      assisted: false,
      now: NOW,
    });

    expect(result.correct).toBe(true);
    expect(result.grade).toBe('Good');
    expect(reviewRepo.logs).toHaveLength(1);
    expect(reviewRepo.stateOf(USER, 'i-mcq')).not.toBeNull();
  });

  it('bonne réponse après aide → Hard', async () => {
    const result = await submitAnswer.execute({
      userId: USER,
      lessonId: 'l1',
      exerciseId: 'x-mcq',
      answer: { kind: 'mcq', choice: 1 },
      assisted: true,
      now: NOW,
    });

    expect(result.grade).toBe('Hard');
  });

  it('mauvaise réponse → Again, révision quand même enregistrée', async () => {
    const result = await submitAnswer.execute({
      userId: USER,
      lessonId: 'l1',
      exerciseId: 'x-mcq',
      answer: { kind: 'mcq', choice: 0 },
      assisted: false,
      now: NOW,
    });

    expect(result.correct).toBe(false);
    expect(result.grade).toBe('Again');
    expect(reviewRepo.logs).toHaveLength(1);
  });

  it('texte à trous tolérant (casse/accents)', async () => {
    const result = await submitAnswer.execute({
      userId: USER,
      lessonId: 'l1',
      exerciseId: 'x-fill',
      answer: { kind: 'fill_blank', text: '  ÉBBINGHAUS ' },
      assisted: false,
      now: NOW,
    });

    expect(result.correct).toBe(true);
    expect(result.grade).toBe('Good');
  });

  it('lève sur un exercice inconnu', async () => {
    await expect(
      submitAnswer.execute({
        userId: USER,
        lessonId: 'l1',
        exerciseId: 'x-inconnu',
        answer: { kind: 'mcq', choice: 0 },
        assisted: false,
        now: NOW,
      }),
    ).rejects.toThrow(ExerciseNotFoundError);
  });

  it('la révision passe bien par FSRS (échéance repoussée)', async () => {
    const result = await submitAnswer.execute({
      userId: USER,
      lessonId: 'l1',
      exerciseId: 'x-mcq',
      answer: { kind: 'mcq', choice: 1 },
      assisted: false,
      now: NOW,
    });

    expect(result.review.state.due.getTime()).toBeGreaterThan(NOW.getTime());
  });
});
