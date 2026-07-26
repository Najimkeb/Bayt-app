import type { AdminUser, AllowedEmail, ResetLink } from './admin-types';
import type { DomainList } from './domain-types';
import type { DraftCardStatus, DraftDetail, DraftSummary, LessonLevel } from './draft-types';
import type { EvaluationResult, ExplanationHistoryEntry } from './explanation-types';
import type { DocumentCards, DocumentDto, DocumentList } from './document-types';
import type { AnswerResult, ExerciseAnswer, Lesson } from './lesson-types';
import type { LearningPath } from './path-types';
import type { ProfileData } from './profile-types';
import type { DailyStatus, IncrementResult, XpEvent } from './progress-types';
import type { DueQueue, Preview, ReviewGrade, ReviewResult } from './types';

/**
 * Client HTTP du Worker BAYT.
 *
 * Le front ne calcule jamais de planification : il lit et il ecrit, le domaine
 * decide (cf. lessons.md L003). Toute la logique FSRS reste derriere l'API.
 *
 * **L'`userId` ne circule plus** : le Worker le déduit du cookie de session.
 * Toutes les requêtes envoient donc les cookies (`credentials: 'include'`).
 */

/** URL du Worker — surchargeable via `NEXT_PUBLIC_API_URL`. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

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
      // Envoie le cookie de session : sans lui, le Worker répond 401.
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    // Cas le plus frequent en local : le Worker n'est pas demarre.
    throw new ApiError(0, `L'API BAYT est injoignable sur ${API_URL}.`);
  }

  if (!response.ok) {
    throw new ApiError(response.status, `L'API a repondu ${String(response.status)}.`);
  }

  return (await response.json()) as T;
}

/**
 * Cartes a reviser maintenant.
 *
 * `domainId` filtre la file sur un domaine ; absent = tous domaines confondus.
 */
export function fetchDueQueue(limit = 20, domainId?: string): Promise<DueQueue> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (domainId !== undefined) {
    params.set('domainId', domainId);
  }

  return request<DueQueue>(`/reviews/queue?${params.toString()}`);
}

/** Intervalles qui seraient appliques pour chacune des 4 notes. */
export function fetchPreview(itemId: string): Promise<Preview> {
  return request<Preview>(`/reviews/preview?itemId=${encodeURIComponent(itemId)}`);
}

/** Enregistre une revision et recupere la replanification. */
export function submitReview(itemId: string, grade: ReviewGrade): Promise<ReviewResult> {
  return request<ReviewResult>('/reviews', {
    method: 'POST',
    body: JSON.stringify({ itemId, grade }),
  });
}

/** Une révision faite hors-ligne, à rejouer (id client + instant réel). */
export interface OfflineReviewInput {
  readonly clientId: string;
  readonly itemId: string;
  readonly grade: ReviewGrade;
  readonly reviewedAt: string;
}

/**
 * Rejoue la file de révisions hors-ligne. **Idempotent** : renvoie les ids
 * clients durablement pris en compte, que le client purge ensuite.
 */
export function replayReviews(
  reviews: readonly OfflineReviewInput[],
): Promise<{ settledClientIds: string[] }> {
  return request<{ settledClientIds: string[] }>('/reviews/replay', {
    method: 'POST',
    body: JSON.stringify({ reviews }),
  });
}

/** Nombre total de cartes dues (badge de navigation, rappel dans l'app). */
export function fetchDueCount(): Promise<{ count: number }> {
  return request<{ count: number }>('/reviews/count');
}

/** Réglages de rappel de l'apprenant (niveau 1). */
export interface ReminderSettings {
  readonly enabled: boolean;
  readonly hour: number;
  readonly timezone: string;
}

/** Lit les réglages de rappel (défaut désactivé si aucun réglage). */
export function fetchReminderSettings(timezone: string): Promise<ReminderSettings> {
  return request<ReminderSettings>(`/reminders?timezone=${encodeURIComponent(timezone)}`);
}

/** Enregistre les réglages de rappel. */
export function saveReminderSettings(settings: ReminderSettings): Promise<ReminderSettings> {
  return request<ReminderSettings>('/reminders', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

/** Clé publique VAPID à passer à `pushManager.subscribe` (niveau 2). */
export function fetchPushPublicKey(): Promise<{ publicKey: string | null }> {
  return request<{ publicKey: string | null }>('/push/public-key');
}

/** Enregistre l'abonnement Web Push du navigateur. */
export function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });
}

/** Supprime l'abonnement Web Push (cet appareil). */
export function deletePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint }),
  });
}

/** Une leçon jouable (exercices sans leurs solutions). */
export function fetchLesson(lessonId: string): Promise<Lesson> {
  return request<Lesson>(`/lessons/${encodeURIComponent(lessonId)}`);
}

/** Soumet une réponse d'exercice ; renvoie correction + note FSRS. */
export function submitAnswer(input: {
  lessonId: string;
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
export function fetchProgress(timezone: string): Promise<DailyStatus> {
  return request<DailyStatus>(`/progress?timezone=${encodeURIComponent(timezone)}`);
}

/** Profil + statistiques agrégées (identité, séries, santé mémoire, activité). */
export function fetchProfile(timezone: string): Promise<ProfileData> {
  return request<ProfileData>(`/profile?timezone=${encodeURIComponent(timezone)}`);
}

/** Change l'objectif quotidien (cible d'XP/jour) ; renvoie la vue du jour à jour. */
export function setDailyGoal(dailyGoal: number, timezone: string): Promise<DailyStatus> {
  return request<DailyStatus>('/progress/goal', {
    method: 'POST',
    body: JSON.stringify({ dailyGoal, timezone }),
  });
}

// ── Administration (réservé aux admins ; l'API renvoie 403 sinon) ────────────

/** Liste blanche d'inscription. */
export function fetchAllowedEmails(): Promise<{ emails: AllowedEmail[] }> {
  return request<{ emails: AllowedEmail[] }>('/admin/allowed-emails');
}

/** Autorise un e-mail (renvoie la liste à jour). */
export function addAllowedEmail(email: string, note: string): Promise<{ emails: AllowedEmail[] }> {
  return request<{ emails: AllowedEmail[] }>('/admin/allowed-emails', {
    method: 'POST',
    body: JSON.stringify({ email, ...(note !== '' ? { note } : {}) }),
  });
}

/** Retire un e-mail de la liste blanche (renvoie la liste à jour). */
export function removeAllowedEmail(email: string): Promise<{ emails: AllowedEmail[] }> {
  return request<{ emails: AllowedEmail[] }>(`/admin/allowed-emails/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
}

/** Comptes inscrits. */
export function fetchAdminUsers(): Promise<{ users: AdminUser[] }> {
  return request<{ users: AdminUser[] }>('/admin/users');
}

/** Génère un lien de réinitialisation à usage unique pour un compte. */
export function createResetToken(userId: string): Promise<ResetLink> {
  return request<ResetLink>(`/admin/users/${encodeURIComponent(userId)}/reset-token`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** Révoque l'accès d'un compte (liste blanche + sessions). */
export function revokeUser(userId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/users/${encodeURIComponent(userId)}/revoke`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// ── Studio de leçons sourcées (admin) ────────────────────────────────────────

/** Génère un brouillon sourcé par recherche web ; renvoie l'id du brouillon. */
export function generateSourcedLesson(input: {
  topic: string;
  domainId: string;
  level: LessonLevel;
}): Promise<{ draftId: string }> {
  return request<{ draftId: string }>('/admin/lessons/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Identifiant d'une tranche de fréquence de vocabulaire. */
export type VocabTranche = '1-100' | '100-300' | '300-600' | '600-1000';

/** Récap d'une génération de vocabulaire (économie de quota). */
export interface VocabularyResult {
  readonly draftId: string | null;
  readonly requested: number;
  readonly created: number;
  readonly duplicatesSkipped: number;
  readonly batches: number;
}

/** Génère un brouillon de vocabulaire par tranche de fréquence ; renvoie le récap. */
export function generateVocabulary(input: {
  tranche: VocabTranche;
  domainId: string;
  batchSize?: number;
}): Promise<VocabularyResult> {
  return request<VocabularyResult>('/admin/lessons/vocabulary', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Brouillons existants. */
export function fetchDrafts(): Promise<{ drafts: DraftSummary[] }> {
  return request<{ drafts: DraftSummary[] }>('/admin/lessons/drafts');
}

/** Un brouillon avec ses cartes, sources et annotations d'audit. */
export function fetchDraft(id: string): Promise<DraftDetail> {
  return request<DraftDetail>(`/admin/lessons/drafts/${encodeURIComponent(id)}`);
}

/** Corrige le recto/verso d'une carte. */
export function editDraftCard(
  draftId: string,
  cardId: string,
  patch: { front: string; back: string },
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(
    `/admin/lessons/drafts/${encodeURIComponent(draftId)}/cards/${encodeURIComponent(cardId)}`,
    { method: 'POST', body: JSON.stringify(patch) },
  );
}

/** Change le statut de relecture d'une carte. */
export function setDraftCardStatus(
  draftId: string,
  cardId: string,
  status: DraftCardStatus,
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(
    `/admin/lessons/drafts/${encodeURIComponent(draftId)}/cards/${encodeURIComponent(cardId)}/status`,
    { method: 'POST', body: JSON.stringify({ status }) },
  );
}

/** Supprime une carte du brouillon. */
export function deleteDraftCard(draftId: string, cardId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(
    `/admin/lessons/drafts/${encodeURIComponent(draftId)}/cards/${encodeURIComponent(cardId)}`,
    { method: 'DELETE' },
  );
}

/** Ajoute une carte (source obligatoire) ; renvoie le brouillon à jour. */
export function addDraftCard(
  draftId: string,
  card: { front: string; back: string; sourceUrl: string; sourceExtract: string },
): Promise<DraftDetail> {
  return request<DraftDetail>(`/admin/lessons/drafts/${encodeURIComponent(draftId)}/cards`, {
    method: 'POST',
    body: JSON.stringify(card),
  });
}

/** Publie le brouillon : les cartes validées entrent dans le circuit FSRS. */
export function publishDraft(draftId: string): Promise<{ published: number }> {
  return request<{ published: number }>(
    `/admin/lessons/drafts/${encodeURIComponent(draftId)}/publish`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

// ── « Explique à BAYT » ──────────────────────────────────────────────────────

/** Soumet une explication ; BAYT l'évalue (et note FSRS si reliée à une carte). */
export function evaluateExplanation(input: {
  topic: string;
  itemId?: string;
  explanation: string;
}): Promise<EvaluationResult> {
  return request<EvaluationResult>('/explanations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Historique des explications (progression sur un concept). */
export function fetchExplanationHistory(itemId?: string): Promise<{
  history: ExplanationHistoryEntry[];
}> {
  const query = itemId !== undefined ? `?itemId=${encodeURIComponent(itemId)}` : '';

  return request<{ history: ExplanationHistoryEntry[] }>(`/explanations${query}`);
}

/** Crée une carte (brouillon) à partir d'une explication (sujet libre). */
export function createExplanationDraft(input: {
  topic: string;
  reformulation: string;
  explanation: string;
  domainId?: string;
}): Promise<{ draftId: string }> {
  return request<{ draftId: string }>('/explanations/draft', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Définit un nouveau mot de passe via un jeton (écran public `/reset-password`).
 *
 * En cas d'échec, l'erreur porte le **code** serveur (`token_expired`,
 * `token_invalid`, `invalid_request`) comme `message`, pour un retour précis.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/reset-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
  } catch {
    throw new ApiError(0, `L'API BAYT est injoignable sur ${API_URL}.`);
  }

  if (!response.ok) {
    let code: string | undefined;
    try {
      code = ((await response.json()) as { error?: string }).error;
    } catch {
      code = undefined;
    }
    throw new ApiError(response.status, code ?? 'error');
  }
}

/** Enregistre un gain d'XP (l'XP est calculé côté domaine). */
export function incrementProgress(input: {
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
export async function uploadDocument(file: File, domainId?: string): Promise<DocumentDto> {
  const form = new FormData();
  form.set('file', file);
  // Domaine de rattachement choisi au dépôt (les cartes en héritent).
  if (domainId !== undefined && domainId !== '') {
    form.set('domainId', domainId);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
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
export function fetchDocuments(): Promise<DocumentList> {
  return request<DocumentList>('/documents');
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
    response = await fetch(`${API_URL}/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, `L'API BAYT est injoignable sur ${API_URL}.`);
  }

  if (!response.ok) {
    throw new ApiError(response.status, `L'API a repondu ${String(response.status)}.`);
  }
}

/** Catalogue : domaines avec la progression de l'apprenant. */
export function fetchDomains(): Promise<DomainList> {
  return request<DomainList>('/domains');
}

/** Chemin de progression d'un domaine : ses unités, leçons et leur état. */
export function fetchPath(domainId: string): Promise<LearningPath> {
  return request<LearningPath>(`/path?domainId=${encodeURIComponent(domainId)}`);
}

/** Marque une leçon terminée (débloque la suivante). L'UI réinvalide le chemin. */
export function markLessonComplete(lessonId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/lessons/${encodeURIComponent(lessonId)}/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
