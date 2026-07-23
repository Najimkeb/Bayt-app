import { Scheduler } from '@bayt/domain';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';

import type { IngestionMessage } from './application/ports/ingestion-queue.js';
import { IngestDocument } from './application/use-cases/ingest-document.js';
import { createApp } from './http/app.js';
import { CardGenerator } from './ingestion/card-generator.js';
import { HeuristicProvider } from './ingestion/llm/heuristic-provider.js';
import { WorkersAiProvider, type WorkersAiBinding } from './ingestion/llm/workers-ai-provider.js';
import type { LLMProvider } from './ingestion/llm/provider.js';
import { CfIngestionQueue, type QueueLike } from './infrastructure/queue/cf-ingestion-queue.js';
import { D1DocumentRepository } from './infrastructure/repositories/d1-document.repository.js';
import { D1LessonRepository } from './infrastructure/repositories/d1-lesson.repository.js';
import { D1PathRepository } from './infrastructure/repositories/d1-path.repository.js';
import { D1ProgressRepository } from './infrastructure/repositories/d1-progress.repository.js';
import { D1ReviewRepository } from './infrastructure/repositories/d1-review.repository.js';
import { R2ObjectStorage, type R2Like } from './infrastructure/storage/r2-object-storage.js';

/**
 * Bindings Cloudflare attendus par le Worker (cf. wrangler.jsonc).
 *
 * `AI` est optionnel : sans lui (dev local hors ligne), l'ingestion retombe sur
 * un générateur heuristique local, sans réseau ni compte Cloudflare.
 */
export interface Env {
  readonly DB: D1Database;
  readonly DOCS: R2Like;
  readonly INGESTION_QUEUE: QueueLike;
  readonly AI?: WorkersAiBinding;
}

/**
 * Choisit le fournisseur LLM : Workers AI si le binding existe, sinon le repli
 * heuristique local.
 *
 * Journalise QUEL fournisseur est retenu, pour qu'on sache toujours si les
 * cartes viennent d'une vraie IA (WorkersAI) ou du substitut de dev
 * (Heuristic). Visible dans les logs `wrangler dev` / `wrangler tail`.
 */
function createProvider(env: Env): LLMProvider {
  if (env.AI) {
    const provider = new WorkersAiProvider(env.AI);
    console.log(`[ingestion] Provider LLM = WorkersAI · modèle ${provider.model}`);

    return provider;
  }

  console.log(
    '[ingestion] Provider LLM = Heuristic · binding AI absent → repli local (cartes NON issues d’une IA)',
  );

  return new HeuristicProvider();
}

/** Construit le consumer d'ingestion à partir des bindings. */
function createIngestor(db: DrizzleD1Database, env: Env): IngestDocument {
  return new IngestDocument(
    new D1DocumentRepository(db),
    new R2ObjectStorage(env.DOCS),
    new CardGenerator(createProvider(env)),
  );
}

/**
 * Point d'entree du Worker BAYT — la seule couche qui connaisse Cloudflare.
 *
 * `fetch` cable les bindings sur l'application HTTP ; `queue` traite les
 * documents de maniere asynchrone, hors du chemin critique de l'upload.
 */
export default {
  fetch(request: Request, env: Env, context: ExecutionContext): Response | Promise<Response> {
    const db = drizzle(env.DB);
    const app = createApp({
      repository: new D1ReviewRepository(db),
      lessonRepository: new D1LessonRepository(db),
      progressRepository: new D1ProgressRepository(db),
      pathRepository: new D1PathRepository(db),
      documentRepository: new D1DocumentRepository(db),
      objectStorage: new R2ObjectStorage(env.DOCS),
      ingestionQueue: new CfIngestionQueue(env.INGESTION_QUEUE),
      scheduler: new Scheduler(),
    });

    return app.fetch(request, env, context);
  },

  async queue(batch: MessageBatch<IngestionMessage>, env: Env): Promise<void> {
    const ingest = createIngestor(drizzle(env.DB), env);

    for (const message of batch.messages) {
      // IngestDocument fixe l'état final (ready/failed) ; on acquitte toujours.
      await ingest.execute(message.body.documentId);
      message.ack();
    }
  },
};
