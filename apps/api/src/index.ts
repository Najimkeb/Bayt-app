import { Scheduler } from '@bayt/domain';
import { drizzle } from 'drizzle-orm/d1';

import { createApp } from './http/app.js';
import { D1LessonRepository } from './infrastructure/repositories/d1-lesson.repository.js';
import { D1PathRepository } from './infrastructure/repositories/d1-path.repository.js';
import { D1ProgressRepository } from './infrastructure/repositories/d1-progress.repository.js';
import { D1ReviewRepository } from './infrastructure/repositories/d1-review.repository.js';

/** Bindings Cloudflare attendus par le Worker (cf. wrangler.jsonc). */
export interface Env {
  readonly DB: D1Database;
}

/**
 * Point d'entree du Worker BAYT — la seule couche qui connaisse Cloudflare.
 *
 * Son unique responsabilite : cabler les bindings sur l'application HTTP.
 * Le domaine ignore D1, l'application ignore Drizzle, les routes ignorent le
 * Worker.
 */
export default {
  fetch(request: Request, env: Env, context: ExecutionContext): Response | Promise<Response> {
    const db = drizzle(env.DB);
    const app = createApp({
      repository: new D1ReviewRepository(db),
      lessonRepository: new D1LessonRepository(db),
      progressRepository: new D1ProgressRepository(db),
      pathRepository: new D1PathRepository(db),
      scheduler: new Scheduler(),
    });

    return app.fetch(request, env, context);
  },
};
