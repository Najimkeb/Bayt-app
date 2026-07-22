import { Scheduler } from '@bayt/domain';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { ItemNotFoundError } from '../application/errors.js';
import type { ReviewRepository } from '../application/ports/review-repository.js';
import { GetDueQueue } from '../application/use-cases/get-due-queue.js';
import { PreviewReview } from '../application/use-cases/preview-review.js';
import { SubmitReview } from '../application/use-cases/submit-review.js';
import { presentDueCard, presentPreview, presentReviewResult } from './presenters.js';
import { dueQueueQuerySchema, previewQuerySchema, submitReviewBodySchema } from './schemas.js';

/** Dependances injectees dans l'application HTTP. */
export interface AppDependencies {
  readonly repository: ReviewRepository;
  readonly scheduler: Scheduler;
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
