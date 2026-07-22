import { defineConfig } from 'drizzle-kit';

/**
 * Configuration drizzle-kit — generation des migrations D1 uniquement.
 *
 * On ne configure volontairement aucune connexion distante : les migrations
 * sont appliquees par wrangler (`pnpm db:migrate:local`), en local, sans compte
 * Cloudflare.
 */
export default defineConfig({
  dialect: 'sqlite',
  driver: 'd1-http',
  schema: './src/infrastructure/db/schema.ts',
  out: './migrations',
});
