import type { AnswerResult, ExerciseAnswer, Lesson } from './lesson-types';
import type { DueQueue, Preview, ReviewGrade, ReviewResult } from './types';

/**
 * Client HTTP du Worker BAYT.
 *
 * Le front ne calcule jamais de planification : il lit et il ecrit, le domaine
 * decide (cf. lessons.md L003). Toute la logique FSRS reste derriere l'API.
 */

/** URL du Worker — surchargeable via `NEXT_PUBLIC_API_URL`. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

/**
 * Apprenant de demonstration.
 *
 * Provisoire : sera remplace par la session une fois le contexte
 * « Identity & Access » en place.
 */
export const DEMO_USER_ID = 'demo';

/** Erreur remontee par l'API, avec son statut HTTP. */
export class ApiError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    // Cas le plus frequent en local : le Worker n'est pas demarre.
    throw new ApiError(0, `L'API BAYT est injoignable sur ${API_URL}.`);
  }

  if (!response.ok) {
    throw new ApiError(response.status, `L'API a repondu ${response.status}.`);
  }

  return (await response.json()) as T;
}

/** Cartes a reviser maintenant. */
export function fetchDueQueue(userId: string, limit = 20): Promise<DueQueue> {
  return request<DueQueue>(
    `/reviews/queue?userId=${encodeURIComponent(userId)}&limit=${String(limit)}`,
  );
}

/** Intervalles qui seraient appliques pour chacune des 4 notes. */
export function fetchPreview(userId: string, itemId: string): Promise<Preview> {
  return request<Preview>(
    `/reviews/preview?userId=${encodeURIComponent(userId)}&itemId=${encodeURIComponent(itemId)}`,
  );
}

/** Enregistre une revision et recupere la replanification. */
export function submitReview(
  userId: string,
  itemId: string,
  grade: ReviewGrade,
): Promise<ReviewResult> {
  return request<ReviewResult>('/reviews', {
    method: 'POST',
    body: JSON.stringify({ userId, itemId, grade }),
  });
}

/** Une leçon jouable (exercices sans leurs solutions). */
export function fetchLesson(lessonId: string): Promise<Lesson> {
  return request<Lesson>(`/lessons/${encodeURIComponent(lessonId)}`);
}

/** Soumet une réponse d'exercice ; renvoie correction + note FSRS. */
export function submitAnswer(input: {
  lessonId: string;
  userId: string;
  exerciseId: string;
  answer: ExerciseAnswer;
  assisted: boolean;
}): Promise<AnswerResult> {
  const { lessonId, ...body } = input;

  return request<AnswerResult>(`/lessons/${encodeURIComponent(lessonId)}/answers`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
