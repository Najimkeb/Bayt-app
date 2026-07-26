import { Scheduler } from '@bayt/domain';
import { hashPassword } from 'better-auth/crypto';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';

import type { IngestionMessage } from './application/ports/ingestion-queue.js';
import { IngestDocument } from './application/use-cases/ingest-document.js';
import { createAuth } from './auth/auth.js';
import { createApp } from './http/app.js';
import { BetterAuthSessionVerifier } from './http/session.js';
import { CardGenerator } from './ingestion/card-generator.js';
import { HeuristicProvider } from './ingestion/llm/heuristic-provider.js';
import { WorkersAiProvider, type WorkersAiBinding } from './ingestion/llm/workers-ai-provider.js';
import type { LLMProvider } from './ingestion/llm/provider.js';
import { CfIngestionQueue, type QueueLike } from './infrastructure/queue/cf-ingestion-queue.js';
import { D1AccessRepository } from './infrastructure/repositories/d1-access.repository.js';
import { D1AdminUserRepository } from './infrastructure/repositories/d1-admin-user.repository.js';
import { D1DocumentRepository } from './infrastructure/repositories/d1-document.repository.js';
import { D1IdentityRepository } from './infrastructure/repositories/d1-identity.repository.js';
import { D1LessonRepository } from './infrastructure/repositories/d1-lesson.repository.js';
import {
  D1CredentialRepository,
  D1PasswordResetTokenRepository,
} from './infrastructure/repositories/d1-password-reset.repository.js';
import { D1PathRepository } from './infrastructure/repositories/d1-path.repository.js';
import { D1ProfileStatsRepository } from './infrastructure/repositories/d1-profile-stats.repository.js';
import { D1ProgressRepository } from './infrastructure/repositories/d1-progress.repository.js';
import { D1ReviewRepository } from './infrastructure/repositories/d1-review.repository.js';
import { D1DocumentStorage } from './infrastructure/storage/d1-document-storage.js';

/**
 * Bindings Cloudflare attendus par le Worker (cf. wrangler.jsonc).
 *
 * `AI` est optionnel : sans lui (dev local hors ligne), l'ingestion retombe sur
 * un générateur heuristique local, sans réseau ni compte Cloudflare.
 */
export interface Env {
  readonly DB: D1Database;
  readonly INGESTION_QUEUE: QueueLike;
  readonly AI?: WorkersAiBinding;
  /** Secret de signature Better Auth (`.dev.vars` en local, secret Worker en prod). */
  readonly BETTER_AUTH_SECRET: string;
  /** URL publique de l'API (base des routes `/api/auth`). Défaut : origine de la requête. */
  readonly BETTER_AUTH_URL?: string;
  /** Origine du front autorisée (session + CORS). Défaut : localhost:3000. */
  readonly WEB_ORIGIN?: string;
  /** Domaine du cookie de session partagé entre sous-domaines (prod, ex. `.bayt.app`). */
  readonly COOKIE_DOMAIN?: string;
  /**
   * Cache KV de production (compteur de cartes dues, sessions…).
   * Provisionné, pas encore consommé par le code — binding prêt à l'emploi.
   */
  readonly KV?: KVNamespace;
}

/** Origines du front autorisées (session + CORS) — surchargées par `WEB_ORIGIN`. */
function webOrigins(env: Env): string[] {
  return env.WEB_ORIGIN !== undefined && env.WEB_ORIGIN !== ''
    ? [env.WEB_ORIGIN]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];
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
    new D1DocumentStorage(db),
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
    // UNE seule instance Drizzle par requête, partagée par les repositories ET
    // par Better Auth (le binding D1 n'existe que dans ce contexte de requête).
    const db = drizzle(env.DB);

    const origins = webOrigins(env);
    // Partagé par le hook d'invitation (Better Auth) ET les routes admin.
    const accessRepository = new D1AccessRepository(db);
    const auth = createAuth(db, {
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL ?? new URL(request.url).origin,
      trustedOrigins: origins,
      // Liste blanche : inscription et connexion réservées aux e-mails invités.
      isEmailAllowed: (email) => accessRepository.isAllowed(email),
      ...(env.COOKIE_DOMAIN !== undefined && env.COOKIE_DOMAIN !== ''
        ? { cookieDomain: env.COOKIE_DOMAIN }
        : {}),
    });

    const app = createApp({
      repository: new D1ReviewRepository(db),
      lessonRepository: new D1LessonRepository(db),
      progressRepository: new D1ProgressRepository(db),
      pathRepository: new D1PathRepository(db),
      identityRepository: new D1IdentityRepository(db),
      profileStatsRepository: new D1ProfileStatsRepository(db),
      accessRepository,
      adminUserRepository: new D1AdminUserRepository(db),
      passwordResetTokenRepository: new D1PasswordResetTokenRepository(db),
      credentialRepository: new D1CredentialRepository(db),
      passwordHasher: (password) => hashPassword(password),
      webOrigin: origins[0],
      documentRepository: new D1DocumentRepository(db),
      documentStorage: new D1DocumentStorage(db),
      ingestionQueue: new CfIngestionQueue(env.INGESTION_QUEUE),
      scheduler: new Scheduler(),
      sessionVerifier: new BetterAuthSessionVerifier(auth),
      authHandler: (raw) => auth.handler(raw),
      allowedOrigins: origins,
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
