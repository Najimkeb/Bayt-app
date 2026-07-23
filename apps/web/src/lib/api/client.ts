import type { DocumentCards, DocumentDto, DocumentList } from './document-types';
import type { AnswerResult, ExerciseAnswer, Lesson } from './lesson-types';
import type { LearningPath } from './path-types';
import type { DailyStatus, IncrementResult, XpEvent } from './progress-types';
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

/** Progression de gamification du jour (XP, objectif, série). */
export function fetchProgress(userId: string, timezone: string): Promise<DailyStatus> {
  return request<DailyStatus>(
    `/progress?userId=${encodeURIComponent(userId)}&timezone=${encodeURIComponent(timezone)}`,
  );
}

/** Enregistre un gain d'XP (l'XP est calculé côté domaine). */
export function incrementProgress(input: {
  userId: string;
  event: XpEvent;
  timezone: string;
}): Promise<IncrementResult> {
  return request<IncrementResult>('/progress/increment', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Dépose un document à ingérer.
 *
 * Envoi en `multipart/form-data` : on ne passe **pas** par `request`, qui force
 * un `Content-Type: application/json`. Ici on laisse le navigateur poser le
 * `Content-Type` et sa frontière (boundary) multipart lui-même.
 */
export async function uploadDocument(userId: string, file: File): Promise<DocumentDto> {
  const form = new FormData();
  form.set('file', file);
  form.set('userId', userId);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/documents`, { method: 'POST', body: form });
  } catch {
    throw new ApiError(0, `L'API BAYT est injoignable sur ${API_URL}.`);
  }

  if (!response.ok) {
    // 415 = format non pris en charge : on remonte le motif de l'API si présent.
    let detail: string | undefined;
    try {
      detail = ((await response.json()) as { detail?: string }).detail;
    } catch {
      detail = undefined;
    }
    throw new ApiError(response.status, detail ?? `L'API a repondu ${String(response.status)}.`);
  }

  return (await response.json()) as DocumentDto;
}

/** Documents de l'apprenant, du plus récent au plus ancien. */
export function fetchDocuments(userId: string): Promise<DocumentList> {
  return request<DocumentList>(`/documents?userId=${encodeURIComponent(userId)}`);
}

/** Statut de traitement d'un document précis (utilisé par le polling). */
export function fetchDocument(id: string): Promise<DocumentDto> {
  return request<DocumentDto>(`/documents/${encodeURIComponent(id)}`);
}

/** Cartes générées (recto/verso) d'un document. */
export function fetchDocumentCards(id: string): Promise<DocumentCards> {
  return request<DocumentCards>(`/documents/${encodeURIComponent(id)}/cards`);
}

/**
 * Supprime un document et ses cartes.
 *
 * L'API répond 204 (sans corps) : on ne passe pas par `request`, qui essaie de
 * parser du JSON.
 */
export async function deleteDocument(id: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch {
    throw new ApiError(0, `L'API BAYT est injoignable sur ${API_URL}.`);
  }

  if (!response.ok) {
    throw new ApiError(response.status, `L'API a repondu ${String(response.status)}.`);
  }
}

/** Chemin de progression : unités, leçons et leur état. */
export function fetchPath(userId: string): Promise<LearningPath> {
  return request<LearningPath>(`/path?userId=${encodeURIComponent(userId)}`);
}

/** Marque une leçon terminée (débloque la suivante) ; renvoie le chemin à jour. */
export function markLessonComplete(userId: string, lessonId: string): Promise<LearningPath> {
  return request<LearningPath>(`/lessons/${encodeURIComponent(lessonId)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}
