import { Scheduler } from '@bayt/domain';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import {
  ExerciseNotFoundError,
  ItemNotFoundError,
  LessonNotFoundError,
} from '../application/errors.js';
import type { DocumentRepository } from '../application/ports/document-repository.js';
import type { IngestionQueue } from '../application/ports/ingestion-queue.js';
import type { LessonRepository } from '../application/ports/lesson-repository.js';
import type { ObjectStorage } from '../application/ports/object-storage.js';
import type { PathRepository } from '../application/ports/path-repository.js';
import type { ProgressRepository } from '../application/ports/progress-repository.js';
import type { ReviewRepository } from '../application/ports/review-repository.js';
import { CompleteLesson } from '../application/use-cases/complete-lesson.js';
import { SubmitDocument } from '../application/use-cases/submit-document.js';
import { UnsupportedFormatError } from '../ingestion/format.js';
import { presentDocument, presentDocumentCard } from './document-dto.js';
import { GetDueQueue } from '../application/use-cases/get-due-queue.js';
import { GetLesson } from '../application/use-cases/get-lesson.js';
import { GetPath } from '../application/use-cases/get-path.js';
import { GetProgress } from '../application/use-cases/get-progress.js';
import { IncrementProgress } from '../application/use-cases/increment-progress.js';
import { PreviewReview } from '../application/use-cases/preview-review.js';
import { SubmitExerciseAnswer } from '../application/use-cases/submit-exercise-answer.js';
import { SubmitReview } from '../application/use-cases/submit-review.js';
import { presentAnswerResult, presentLesson } from './lesson-presenters.js';
import { presentDueCard, presentPreview, presentReviewResult } from './presenters.js';
import {
  completeLessonBodySchema,
  documentsQuerySchema,
  dueQueueQuerySchema,
  incrementProgressBodySchema,
  pathQuerySchema,
  previewQuerySchema,
  progressQuerySchema,
  submitAnswerBodySchema,
  submitReviewBodySchema,
} from './schemas.js';

/** Dependances injectees dans l'application HTTP. */
export interface AppDependencies {
  readonly repository: ReviewRepository;
  readonly scheduler: Scheduler;
  /** Persistance des leçons ; les routes `/lessons` ne sont montées que si fournie. */
  readonly lessonRepository?: LessonRepository;
  /** Persistance de la progression ; les routes `/progress` ne sont montées que si fournie. */
  readonly progressRepository?: ProgressRepository;
  /** Persistance du chemin ; les routes `/path` ne sont montées que si fournie. */
  readonly pathRepository?: PathRepository;
  /**
   * Pipeline d'ingestion. Les routes `/documents` ne sont montées que si les
   * trois dépendances (persistance, stockage, file) sont fournies.
   */
  readonly documentRepository?: DocumentRepository;
  readonly objectStorage?: ObjectStorage;
  readonly ingestionQueue?: IngestionQueue;
  /** Horloge injectable — la rend testable et le handler pur. */
  readonly clock?: () => Date;
  /**
   * Origines autorisees a appeler l'API depuis un navigateur.
   *
   * En developpement, le front Next.js tourne sur un autre port que le Worker :
   * sans CORS, le navigateur bloque les requetes.
   */
  readonly allowedOrigins?: readonly string[];
}

/** Origines de developpement local (Next.js). */
const DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'] as const;

/**
 * Application HTTP « Reviser une carte ».
 *
 * Ne contient aucune regle metier : elle valide, delegue aux cas d'usage et
 * presente. Elle ignore tout de D1 — c'est le point d'entree Worker qui choisit
 * l'implementation du repository.
 */
export function createApp({
  repository,
  scheduler,
  lessonRepository,
  progressRepository,
  pathRepository,
  documentRepository,
  objectStorage,
  ingestionQueue,
  clock = () => new Date(),
  allowedOrigins = DEV_ORIGINS,
}: AppDependencies) {
  const getDueQueue = new GetDueQueue(repository, scheduler);
  const previewReview = new PreviewReview(repository, scheduler);
  const submitReview = new SubmitReview(repository, scheduler);

  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: [...allowedOrigins],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
    }),
  );

  /** Sonde de vie, utile en local comme en production. */
  app.get('/health', (context) => context.json({ status: 'ok', now: clock().toISOString() }));

  /** File des cartes dues pour un apprenant. */
  app.get('/reviews/queue', async (context) => {
    const query = dueQueueQuerySchema.safeParse({
      userId: context.req.query('userId'),
      limit: context.req.query('limit'),
    });

    if (!query.success) {
      return context.json({ error: 'invalid_request', details: query.error.issues }, 400);
    }

    const now = clock();
    const cards = await getDueQueue.execute(query.data.userId, now, query.data.limit);

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
    const query = previewQuerySchema.safeParse({
      userId: context.req.query('userId'),
      itemId: context.req.query('itemId'),
    });

    if (!query.success) {
      return context.json({ error: 'invalid_request', details: query.error.issues }, 400);
    }

    const now = clock();

    try {
      const preview = await previewReview.execute(query.data.userId, query.data.itemId, now);

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

    const { userId, itemId, grade, reviewedAt } = body.data;
    const now = reviewedAt === undefined ? clock() : new Date(reviewedAt);

    try {
      const result = await submitReview.execute(userId, itemId, grade, now);

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

      const { userId, exerciseId, answer, assisted, reviewedAt } = body.data;
      const now = reviewedAt === undefined ? clock() : new Date(reviewedAt);

      try {
        const result = await submitAnswer.execute({
          userId,
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

    /** Progression de gamification du jour (XP, objectif, série). */
    app.get('/progress', async (context) => {
      const query = progressQuerySchema.safeParse({
        userId: context.req.query('userId'),
        timezone: context.req.query('timezone'),
      });

      if (!query.success) {
        return context.json({ error: 'invalid_request', details: query.error.issues }, 400);
      }

      const status = await getProgress.execute(query.data.userId, clock(), query.data.timezone);

      return context.json(status);
    });

    /** Enregistre un gain d'XP (l'XP est calculé par le domaine, pas par le client). */
    app.post('/progress/increment', async (context) => {
      const body = incrementProgressBodySchema.safeParse(await readJson(context.req.raw));

      if (!body.success) {
        return context.json({ error: 'invalid_request', details: body.error.issues }, 400);
      }

      const { userId, event, timezone, at } = body.data;
      const now = at === undefined ? clock() : new Date(at);
      const result = await incrementProgress.execute(userId, event, now, timezone);

      return context.json(result, 201);
    });
  }

  if (pathRepository !== undefined) {
    const getPath = new GetPath(pathRepository);
    const completeLesson = new CompleteLesson(pathRepository);

    /** Chemin de progression : unités, leçons et leur état (nœuds). */
    app.get('/path', async (context) => {
      const query = pathQuerySchema.safeParse({ userId: context.req.query('userId') });

      if (!query.success) {
        return context.json({ error: 'invalid_request', details: query.error.issues }, 400);
      }

      return context.json(await getPath.execute(query.data.userId));
    });

    /** Marque une leçon terminée (débloque la suivante) et renvoie le chemin à jour. */
    app.post('/lessons/:lessonId/complete', async (context) => {
      const body = completeLessonBodySchema.safeParse(await readJson(context.req.raw));

      if (!body.success) {
        return context.json({ error: 'invalid_request', details: body.error.issues }, 400);
      }

      const path = await completeLesson.execute(
        body.data.userId,
        context.req.param('lessonId'),
        clock(),
      );

      return context.json(path, 201);
    });
  }

  if (
    documentRepository !== undefined &&
    objectStorage !== undefined &&
    ingestionQueue !== undefined
  ) {
    const submitDocument = new SubmitDocument(
      documentRepository,
      objectStorage,
      ingestionQueue,
      clock,
    );

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

      const userIdField = form.get('userId');
      const userId = typeof userIdField === 'string' && userIdField !== '' ? userIdField : 'demo';

      try {
        const document = await submitDocument.execute({
          userId,
          filename: file.name,
          contentType: file.type === '' ? null : file.type,
          bytes: new Uint8Array(await file.arrayBuffer()),
        });

        return context.json(presentDocument(document), 202);
      } catch (error) {
        if (error instanceof UnsupportedFormatError) {
          return context.json({ error: 'unsupported_format', detail: error.detail }, 415);
        }

        throw error;
      }
    });

    /** Liste des documents d'un apprenant, du plus récent au plus ancien. */
    app.get('/documents', async (context) => {
      const query = documentsQuerySchema.safeParse({ userId: context.req.query('userId') });

      if (!query.success) {
        return context.json({ error: 'invalid_request', details: query.error.issues }, 400);
      }

      const docs = await documentRepository.list(query.data.userId);

      return context.json({ documents: docs.map(presentDocument) });
    });

    /** Statut de traitement d'un document précis. */
    app.get('/documents/:id', async (context) => {
      const document = await documentRepository.findById(context.req.param('id'));

      if (document === null) {
        return context.json({ error: 'document_not_found' }, 404);
      }

      return context.json(presentDocument(document));
    });

    /**
     * Cartes générées par un document (recto/verso) — pour l'aperçu.
     *
     * Lecture seule : montrer le produit fini de l'ingestion. Sans lien avec
     * l'API de leçon, qui masque volontairement les solutions.
     */
    app.get('/documents/:id/cards', async (context) => {
      const id = context.req.param('id');
      const document = await documentRepository.findById(id);

      if (document === null) {
        return context.json({ error: 'document_not_found' }, 404);
      }

      const cards = await documentRepository.listLearningItems(`doc:${id}`);

      return context.json({ documentId: id, cards: cards.map(presentDocumentCard) });
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
