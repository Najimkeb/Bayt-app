import { Scheduler } from '@bayt/domain';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import {
  ExerciseNotFoundError,
  ItemNotFoundError,
  LessonNotFoundError,
} from '../application/errors.js';
import type { AccessRepository } from '../application/ports/access-repository.js';
import type { AdminUserRepository } from '../application/ports/admin-user-repository.js';
import type { DocumentRepository } from '../application/ports/document-repository.js';
import type { DocumentStorage } from '../application/ports/document-storage.js';
import type { IdentityRepository } from '../application/ports/identity-repository.js';
import type { IngestionQueue } from '../application/ports/ingestion-queue.js';
import type { LessonRepository } from '../application/ports/lesson-repository.js';
import type {
  CredentialRepository,
  PasswordResetTokenRepository,
} from '../application/ports/password-reset-repository.js';
import type { PathRepository } from '../application/ports/path-repository.js';
import type { ProfileStatsRepository } from '../application/ports/profile-stats-repository.js';
import type { ProgressRepository } from '../application/ports/progress-repository.js';
import type { ReviewRepository } from '../application/ports/review-repository.js';
import { CompleteLesson } from '../application/use-cases/complete-lesson.js';
import { CreateResetToken } from '../application/use-cases/create-reset-token.js';
import { DeleteDocument } from '../application/use-cases/delete-document.js';
import {
  ExpiredResetTokenError,
  InvalidResetTokenError,
  ResetPasswordWithToken,
} from '../application/use-cases/reset-password.js';
import { RevokeUserAccess } from '../application/use-cases/revoke-user-access.js';
import { SubmitDocument } from '../application/use-cases/submit-document.js';
import { UnsupportedFormatError } from '../ingestion/format.js';
import { presentDocument, presentDocumentCard } from './document-dto.js';
import { GetDomains } from '../application/use-cases/get-domains.js';
import { GetDueQueue } from '../application/use-cases/get-due-queue.js';
import { GetLesson } from '../application/use-cases/get-lesson.js';
import { GetPath } from '../application/use-cases/get-path.js';
import { GetProfile, ProfileNotFoundError } from '../application/use-cases/get-profile.js';
import { GetProgress } from '../application/use-cases/get-progress.js';
import { IncrementProgress } from '../application/use-cases/increment-progress.js';
import { PreviewReview } from '../application/use-cases/preview-review.js';
import { SetDailyGoal } from '../application/use-cases/set-daily-goal.js';
import { SubmitExerciseAnswer } from '../application/use-cases/submit-exercise-answer.js';
import { SubmitReview } from '../application/use-cases/submit-review.js';
import { presentAnswerResult, presentLesson } from './lesson-presenters.js';
import { presentDueCard, presentPreview, presentReviewResult } from './presenters.js';
import type { SessionVerifier } from './session.js';
import {
  addAllowedEmailBodySchema,
  dueQueueQuerySchema,
  incrementProgressBodySchema,
  pathQuerySchema,
  previewQuerySchema,
  progressQuerySchema,
  resetPasswordBodySchema,
  setDailyGoalBodySchema,
  submitAnswerBodySchema,
  submitReviewBodySchema,
} from './schemas.js';

/** Variables posées dans le contexte Hono par le middleware de session. */
interface Variables {
  /** Identifiant de l'apprenant **authentifié** — jamais fourni par le client. */
  userId: string;
}

/** Dependances injectees dans l'application HTTP. */
export interface AppDependencies {
  readonly repository: ReviewRepository;
  readonly scheduler: Scheduler;
  /**
   * Vérificateur de session : traduit les en-têtes d'une requête en `userId`
   * authentifié. Toutes les routes métier le traversent ; sans session valide,
   * la requête est refusée (401).
   */
  readonly sessionVerifier: SessionVerifier;
  /**
   * Handler des routes d'authentification (`/api/auth/*`), fourni par Better
   * Auth. Optionnel : les tests n'en ont pas besoin (ils vérifient la session
   * via un double). Absent → les routes `/api/auth/*` ne sont pas montées.
   */
  readonly authHandler?: (request: Request) => Response | Promise<Response>;
  /** Persistance des leçons ; les routes `/lessons` ne sont montées que si fournie. */
  readonly lessonRepository?: LessonRepository;
  /** Persistance de la progression ; les routes `/progress` ne sont montées que si fournie. */
  readonly progressRepository?: ProgressRepository;
  /** Persistance du chemin ; les routes `/path` ne sont montées que si fournie. */
  readonly pathRepository?: PathRepository;
  /**
   * Lecture d'identité + agrégats de stats. La route `/profile` n'est montée que
   * si les deux sont fournis **et** `progressRepository` l'est aussi.
   */
  readonly identityRepository?: IdentityRepository;
  readonly profileStatsRepository?: ProfileStatsRepository;
  /**
   * Administration (contexte « Identity & Access »). Les routes `/admin/*` — et
   * la garde de rôle — ne sont montées que si les trois sont fournis. La route
   * publique `/reset-password` requiert `passwordResetTokenRepository` +
   * `credentialRepository` + `passwordHasher`.
   */
  readonly accessRepository?: AccessRepository;
  readonly adminUserRepository?: AdminUserRepository;
  readonly passwordResetTokenRepository?: PasswordResetTokenRepository;
  readonly credentialRepository?: CredentialRepository;
  /** Hache un mot de passe (fonction Better Auth) — injecté pour rester testable. */
  readonly passwordHasher?: (password: string) => Promise<string>;
  /** Origine du front, pour bâtir le lien de réinitialisation `/reset-password?token=`. */
  readonly webOrigin?: string | undefined;
  /**
   * Pipeline d'ingestion. Les routes `/documents` ne sont montées que si les
   * trois dépendances (persistance, stockage, file) sont fournies.
   */
  readonly documentRepository?: DocumentRepository;
  readonly documentStorage?: DocumentStorage;
  readonly ingestionQueue?: IngestionQueue;
  /** Horloge injectable — la rend testable et le handler pur. */
  readonly clock?: () => Date;
  /**
   * Origines autorisees a appeler l'API depuis un navigateur.
   *
   * En developpement, le front Next.js tourne sur un autre port que le Worker :
   * sans CORS, le navigateur bloque les requetes. Les cookies de session
   * imposent `credentials: true` et une origine précise (jamais `*`).
   */
  readonly allowedOrigins?: readonly string[];
}

/** Origines de developpement local (Next.js). */
const DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'] as const;

/** Chemins publics : ni session ni 401 (sonde de vie, auth, reset public). */
function isPublicPath(path: string): boolean {
  return path === '/health' || path === '/reset-password' || path.startsWith('/api/auth/');
}

/**
 * Application HTTP « Reviser une carte ».
 *
 * Ne contient aucune regle metier : elle valide, delegue aux cas d'usage et
 * presente. Elle ignore tout de D1 — c'est le point d'entree Worker qui choisit
 * l'implementation du repository. L'`userId` provient **toujours** de la session
 * authentifiée, jamais d'un paramètre de requête.
 */
export function createApp({
  repository,
  scheduler,
  sessionVerifier,
  authHandler,
  lessonRepository,
  progressRepository,
  pathRepository,
  identityRepository,
  profileStatsRepository,
  accessRepository,
  adminUserRepository,
  passwordResetTokenRepository,
  credentialRepository,
  passwordHasher,
  webOrigin,
  documentRepository,
  documentStorage,
  ingestionQueue,
  clock = () => new Date(),
  allowedOrigins = DEV_ORIGINS,
}: AppDependencies) {
  const getDueQueue = new GetDueQueue(repository, scheduler);
  const previewReview = new PreviewReview(repository, scheduler);
  const submitReview = new SubmitReview(repository, scheduler);

  const app = new Hono<{ Variables: Variables }>();

  app.use(
    '*',
    cors({
      origin: [...allowedOrigins],
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
      // Les cookies de session traversent les origines (front ≠ Worker).
      credentials: true,
    }),
  );

  /**
   * Garde d'authentification.
   *
   * Sur toute route non publique : exige une session valide, sinon 401. Le
   * `userId` authentifié est posé dans le contexte pour toute la chaîne aval —
   * les handlers ne l'acceptent plus jamais du client.
   */
  app.use('*', async (context, next) => {
    if (context.req.method === 'OPTIONS' || isPublicPath(context.req.path)) {
      return next();
    }

    const userId = await sessionVerifier.verify(context.req.raw.headers);
    if (userId === null) {
      return context.json({ error: 'unauthorized' }, 401);
    }

    context.set('userId', userId);

    return next();
  });

  /** Routes d'authentification Better Auth (inscription, connexion, session…). */
  if (authHandler !== undefined) {
    app.on(['GET', 'POST'], '/api/auth/*', (context) => authHandler(context.req.raw));
  }

  /** Sonde de vie, utile en local comme en production. */
  app.get('/health', (context) => context.json({ status: 'ok', now: clock().toISOString() }));

  /** File des cartes dues pour l'apprenant authentifié. */
  app.get('/reviews/queue', async (context) => {
    const query = dueQueueQuerySchema.safeParse({
      limit: context.req.query('limit'),
      domainId: context.req.query('domainId'),
    });

    if (!query.success) {
      return context.json({ error: 'invalid_request', details: query.error.issues }, 400);
    }

    const now = clock();
    const cards = await getDueQueue.execute(
      context.get('userId'),
      now,
      query.data.limit,
      query.data.domainId,
    );

    return context.json({
      now: now.toISOString(),
      count: cards.length,
      cards: cards.map(presentDueCard),
    });
  });

  /**
   * Projection des 4 issues possibles pour une carte — sans rien enregistrer.
   * Alimente l'intervalle affiche sous chaque bouton de notation.
   */
  app.get('/reviews/preview', async (context) => {
    const query = previewQuerySchema.safeParse({ itemId: context.req.query('itemId') });

    if (!query.success) {
      return context.json({ error: 'invalid_request', details: query.error.issues }, 400);
    }

    const now = clock();

    try {
      const preview = await previewReview.execute(context.get('userId'), query.data.itemId, now);

      return context.json(presentPreview(query.data.itemId, now, preview));
    } catch (error) {
      if (error instanceof ItemNotFoundError) {
        return context.json({ error: 'item_not_found', itemId: error.itemId }, 404);
      }

      throw error;
    }
  });

  /** Enregistre une revision et replanifie la carte. */
  app.post('/reviews', async (context) => {
    const body = submitReviewBodySchema.safeParse(await readJson(context.req.raw));

    if (!body.success) {
      return context.json({ error: 'invalid_request', details: body.error.issues }, 400);
    }

    const { itemId, grade, reviewedAt } = body.data;
    const now = reviewedAt === undefined ? clock() : new Date(reviewedAt);

    try {
      const result = await submitReview.execute(context.get('userId'), itemId, grade, now);

      return context.json(presentReviewResult(result), 201);
    } catch (error) {
      if (error instanceof ItemNotFoundError) {
        return context.json({ error: 'item_not_found', itemId: error.itemId }, 404);
      }

      throw error;
    }
  });

  if (lessonRepository !== undefined) {
    const getLesson = new GetLesson(lessonRepository);
    const submitAnswer = new SubmitExerciseAnswer(lessonRepository, submitReview);

    /** Une leçon jouable — exercices sans leurs solutions. */
    app.get('/lessons/:lessonId', async (context) => {
      const lessonId = context.req.param('lessonId');

      try {
        const lesson = await getLesson.execute(lessonId);

        return context.json(presentLesson(lesson));
      } catch (error) {
        if (error instanceof LessonNotFoundError) {
          return context.json({ error: 'lesson_not_found', lessonId: error.lessonId }, 404);
        }

        throw error;
      }
    });

    /** Corrige une réponse d'exercice et l'enregistre comme révision FSRS. */
    app.post('/lessons/:lessonId/answers', async (context) => {
      const body = submitAnswerBodySchema.safeParse(await readJson(context.req.raw));

      if (!body.success) {
        return context.json({ error: 'invalid_request', details: body.error.issues }, 400);
      }

      const { exerciseId, answer, assisted, reviewedAt } = body.data;
      const now = reviewedAt === undefined ? clock() : new Date(reviewedAt);

      try {
        const result = await submitAnswer.execute({
          userId: context.get('userId'),
          lessonId: context.req.param('lessonId'),
          exerciseId,
          answer,
          assisted: assisted ?? false,
          now,
        });

        return context.json(presentAnswerResult(result), 201);
      } catch (error) {
        if (error instanceof ExerciseNotFoundError) {
          return context.json({ error: 'exercise_not_found', exerciseId: error.exerciseId }, 404);
        }
        if (error instanceof ItemNotFoundError) {
          return context.json({ error: 'item_not_found', itemId: error.itemId }, 404);
        }

        throw error;
      }
    });
  }

  if (progressRepository !== undefined) {
    const getProgress = new GetProgress(progressRepository);
    const incrementProgress = new IncrementProgress(progressRepository);
    const setDailyGoal = new SetDailyGoal(progressRepository);

    /** Progression de gamification du jour (XP, objectif, série). */
    app.get('/progress', async (context) => {
      const query = progressQuerySchema.safeParse({ timezone: context.req.query('timezone') });

      if (!query.success) {
        return context.json({ error: 'invalid_request', details: query.error.issues }, 400);
      }

      const status = await getProgress.execute(context.get('userId'), clock(), query.data.timezone);

      return context.json(status);
    });

    /** Enregistre un gain d'XP (l'XP est calculé par le domaine, pas par le client). */
    app.post('/progress/increment', async (context) => {
      const body = incrementProgressBodySchema.safeParse(await readJson(context.req.raw));

      if (!body.success) {
        return context.json({ error: 'invalid_request', details: body.error.issues }, 400);
      }

      const { event, timezone, at } = body.data;
      const now = at === undefined ? clock() : new Date(at);
      const result = await incrementProgress.execute(context.get('userId'), event, now, timezone);

      return context.json(result, 201);
    });

    /** Modifie l'objectif quotidien (cible d'XP/jour) et renvoie la vue du jour. */
    app.post('/progress/goal', async (context) => {
      const body = setDailyGoalBodySchema.safeParse(await readJson(context.req.raw));

      if (!body.success) {
        return context.json({ error: 'invalid_request', details: body.error.issues }, 400);
      }

      const status = await setDailyGoal.execute(
        context.get('userId'),
        body.data.dailyGoal,
        clock(),
        body.data.timezone,
      );

      return context.json(status);
    });
  }

  if (
    identityRepository !== undefined &&
    profileStatsRepository !== undefined &&
    progressRepository !== undefined
  ) {
    const getProfile = new GetProfile(
      identityRepository,
      progressRepository,
      profileStatsRepository,
    );

    /** Profil + statistiques agrégées (identité, séries, santé mémoire, activité). */
    app.get('/profile', async (context) => {
      const query = progressQuerySchema.safeParse({ timezone: context.req.query('timezone') });

      if (!query.success) {
        return context.json({ error: 'invalid_request', details: query.error.issues }, 400);
      }

      try {
        const profile = await getProfile.execute(
          context.get('userId'),
          clock(),
          query.data.timezone,
        );

        return context.json(profile);
      } catch (error) {
        if (error instanceof ProfileNotFoundError) {
          return context.json({ error: 'profile_not_found' }, 404);
        }

        throw error;
      }
    });
  }

  // ── Administration (réservée aux admins, rôle vérifié en base) ──────────────
  if (
    identityRepository !== undefined &&
    accessRepository !== undefined &&
    adminUserRepository !== undefined &&
    passwordResetTokenRepository !== undefined
  ) {
    const createResetToken = new CreateResetToken(
      passwordResetTokenRepository,
      identityRepository,
      clock,
    );
    const revokeUser = new RevokeUserAccess(accessRepository, identityRepository, adminUserRepository);

    /**
     * Garde de rôle : toute route `/admin/*` exige un compte **admin**. L'`userId`
     * est déjà posé par la garde de session ; on relit le rôle en base (source de
     * vérité) — un non-admin reçoit 403.
     */
    app.use('/admin/*', async (context, next) => {
      const identity = await identityRepository.findById(context.get('userId'));
      if (identity === null || identity.role !== 'admin') {
        return context.json({ error: 'forbidden' }, 403);
      }

      return next();
    });

    /** Liste blanche : les e-mails autorisés à rejoindre BAYT. */
    app.get('/admin/allowed-emails', async (context) => {
      return context.json({ emails: await accessRepository.list() });
    });

    /** Ajoute (ou met à jour la note d') un e-mail autorisé. */
    app.post('/admin/allowed-emails', async (context) => {
      const body = addAllowedEmailBodySchema.safeParse(await readJson(context.req.raw));
      if (!body.success) {
        return context.json({ error: 'invalid_request', details: body.error.issues }, 400);
      }

      await accessRepository.add(body.data.email, body.data.note ?? null, clock().getTime());

      return context.json({ emails: await accessRepository.list() }, 201);
    });

    /** Retire un e-mail de la liste blanche (bloque les inscriptions futures). */
    app.delete('/admin/allowed-emails/:email', async (context) => {
      await accessRepository.remove(context.req.param('email'));

      return context.json({ emails: await accessRepository.list() });
    });

    /** Comptes inscrits (e-mail, rôle, inscription, dernière activité). */
    app.get('/admin/users', async (context) => {
      return context.json({ users: await adminUserRepository.listUsers() });
    });

    /**
     * Génère un lien de réinitialisation à usage unique pour un compte, à
     * transmettre manuellement. Ne renvoie jamais de mot de passe.
     */
    app.post('/admin/users/:id/reset-token', async (context) => {
      const result = await createResetToken.execute(context.req.param('id'));
      if (result === null) {
        return context.json({ error: 'user_not_found' }, 404);
      }

      const base = webOrigin ?? '';
      const link = `${base}/reset-password?token=${encodeURIComponent(result.token)}`;

      return context.json({ link, expiresAt: result.expiresAt }, 201);
    });

    /** Révoque l'accès d'un compte : retrait de la liste blanche + sessions fermées. */
    app.post('/admin/users/:id/revoke', async (context) => {
      const done = await revokeUser.execute(context.req.param('id'));
      if (!done) {
        return context.json({ error: 'user_not_found' }, 404);
      }

      return context.json({ ok: true });
    });
  }

  // ── Réinitialisation de mot de passe (public, via jeton) ────────────────────
  if (
    passwordResetTokenRepository !== undefined &&
    credentialRepository !== undefined &&
    passwordHasher !== undefined
  ) {
    const resetPassword = new ResetPasswordWithToken(
      passwordResetTokenRepository,
      credentialRepository,
      passwordHasher,
      clock,
    );

    /** Définit un nouveau mot de passe à partir d'un jeton (vérifié côté serveur). */
    app.post('/reset-password', async (context) => {
      const body = resetPasswordBodySchema.safeParse(await readJson(context.req.raw));
      if (!body.success) {
        return context.json({ error: 'invalid_request', details: body.error.issues }, 400);
      }

      try {
        await resetPassword.execute(body.data.token, body.data.newPassword);

        return context.json({ ok: true });
      } catch (error) {
        if (error instanceof ExpiredResetTokenError) {
          return context.json({ error: 'token_expired' }, 400);
        }
        if (error instanceof InvalidResetTokenError) {
          return context.json({ error: 'token_invalid' }, 400);
        }

        throw error;
      }
    });
  }

  if (pathRepository !== undefined) {
    const getDomains = new GetDomains(pathRepository, repository);
    const getPath = new GetPath(pathRepository);
    const completeLesson = new CompleteLesson(pathRepository);

    /** Catalogue : domaines avec la progression de l'apprenant (leçons, cartes dues). */
    app.get('/domains', async (context) => {
      return context.json({ domains: await getDomains.execute(context.get('userId'), clock()) });
    });

    /** Chemin de progression d'un domaine : ses unités, leçons et l'état des nœuds. */
    app.get('/path', async (context) => {
      const query = pathQuerySchema.safeParse({ domainId: context.req.query('domainId') });

      if (!query.success) {
        return context.json({ error: 'invalid_request', details: query.error.issues }, 400);
      }

      return context.json(await getPath.execute(context.get('userId'), query.data.domainId));
    });

    /** Marque une leçon terminée (débloque la suivante). L'UI réinvalide le chemin. */
    app.post('/lessons/:lessonId/complete', async (context) => {
      await completeLesson.execute(context.get('userId'), context.req.param('lessonId'), clock());

      return context.json({ ok: true }, 201);
    });
  }

  if (
    documentRepository !== undefined &&
    documentStorage !== undefined &&
    ingestionQueue !== undefined
  ) {
    const submitDocument = new SubmitDocument(
      documentRepository,
      documentStorage,
      ingestionQueue,
      clock,
    );
    const deleteDocument = new DeleteDocument(documentRepository, documentStorage);

    /** Dépôt d'un document : stocké, mis en file, réponse immédiate (202). */
    app.post('/documents', async (context) => {
      let form: FormData;
      try {
        form = await context.req.raw.formData();
      } catch {
        return context.json({ error: 'invalid_request', detail: 'multipart/form-data attendu' }, 400);
      }

      const file = form.get('file');
      if (!(file instanceof File)) {
        return context.json({ error: 'invalid_request', detail: 'champ « file » manquant' }, 400);
      }

      // Domaine de rattachement, choisi au dépôt. Absent = non catégorisé (null).
      const rawDomainId = form.get('domainId');
      const domainId = typeof rawDomainId === 'string' && rawDomainId !== '' ? rawDomainId : null;

      try {
        const document = await submitDocument.execute({
          userId: context.get('userId'),
          filename: file.name,
          contentType: file.type === '' ? null : file.type,
          bytes: new Uint8Array(await file.arrayBuffer()),
          domainId,
        });

        return context.json(presentDocument(document), 202);
      } catch (error) {
        if (error instanceof UnsupportedFormatError) {
          return context.json({ error: 'unsupported_format', detail: error.detail }, 415);
        }

        throw error;
      }
    });

    /** Liste des documents de l'apprenant authentifié, du plus récent au plus ancien. */
    app.get('/documents', async (context) => {
      const docs = await documentRepository.list(context.get('userId'));

      return context.json({ documents: docs.map(presentDocument) });
    });

    /** Statut d'un document précis — réservé à son propriétaire. */
    app.get('/documents/:id', async (context) => {
      const document = await documentRepository.findById(context.req.param('id'));

      if (document === null || document.userId !== context.get('userId')) {
        return context.json({ error: 'document_not_found' }, 404);
      }

      return context.json(presentDocument(document));
    });

    /**
     * Cartes générées par un document (recto/verso) — pour l'aperçu.
     *
     * Réservé au propriétaire : un autre apprenant reçoit 404. Sans lien avec
     * l'API de leçon, qui masque volontairement les solutions.
     */
    app.get('/documents/:id/cards', async (context) => {
      const id = context.req.param('id');
      const document = await documentRepository.findById(id);

      if (document === null || document.userId !== context.get('userId')) {
        return context.json({ error: 'document_not_found' }, 404);
      }

      const cards = await documentRepository.listLearningItems(`doc:${id}`);

      return context.json({ documentId: id, cards: cards.map(presentDocumentCard) });
    });

    /**
     * Supprime un document et ses cartes (texte extrait compris).
     *
     * Réservé au propriétaire. 204 si supprimé, 404 si absent ou pas à lui.
     */
    app.delete('/documents/:id', async (context) => {
      const removed = await deleteDocument.execute(context.req.param('id'), context.get('userId'));

      return removed
        ? context.body(null, 204)
        : context.json({ error: 'document_not_found' }, 404);
    });
  }

  return app;
}

/** Corps JSON tolerant : un corps absent ou illisible devient une 400. */
async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
