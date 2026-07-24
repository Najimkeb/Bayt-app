# BAYT

Plateforme d'apprentissage assistée par IA — transforme l'utilisateur en expert grâce à la **mémorisation long terme** (SRS/FSRS), une **équipe d'agents IA** et la **gamification**. Pensé comme un SaaS premium.

## Stack

| Couche | Techno |
|--------|--------|
| Infra | Cloudflare — Pages, Workers, D1, R2, KV, Vectorize, Queues, Durable Objects, Workers AI |
| Frontend | Next.js, React, TypeScript, TailwindCSS, shadcn/ui, Framer Motion |
| Backend | Hono, REST propre, architecture modulaire |

## Démarrage

```bash
corepack enable          # active pnpm (version épinglée dans package.json)
pnpm install
pnpm typecheck           # compile packages/* puis vérifie tout le workspace
pnpm test                # vitest (packages/domain)
```

Node ≥ 20 requis. Le gestionnaire de paquets est **pnpm** (workspaces), épinglé via `packageManager`.

## Déploiement en production (Cloudflare)

BAYT est déployé en **deux Workers** sur le domaine `bayt.app` :

| Worker | Rôle | Domaine public | URL technique |
|--------|------|----------------|---------------|
| `bayt-web-production` | Front Next.js (adaptateur **OpenNext**) | `bayt.app` (apex) + `www` → apex | `bayt-web-production.<compte>.workers.dev` |
| `bayt-api-production` | API Hono + auth | `api.bayt.app` | `bayt-api-production.<compte>.workers.dev` |

Front et API partagent le **domaine racine `bayt.app`** : le cookie de session
Better Auth est posé sur `Domain=.bayt.app` (`SameSite=Lax`, `Secure`), donc valable
sur les deux sous-domaines — pas de déconnexion en boucle (cf. `apps/api/src/auth`).

### Ressources de production (plan gratuit)

| Ressource | Nom | Binding |
|-----------|-----|---------|
| D1 (base SQL) | `bayt-prod` | `DB` |
| KV (cache) | `bayt-cache` | `KV` |
| Queue (ingestion async) | `bayt-ingestion` | `INGESTION_QUEUE` |
| Workers AI (génération de cartes) | — | `AI` |

> **R2 non utilisé.** Tant que l'abonnement R2 n'est pas actif, le texte extrait
> des documents est stocké dans D1 (`documents.extracted_text`) derrière le port
> `DocumentStorage` (cf. `lessons.md` L031). R2 reste la cible : fournir une
> implémentation `R2DocumentStorage` + rebrancher le binding, sans toucher au pipeline.

Création des ressources (une fois) :

```bash
cd apps/api
wrangler d1 create bayt-prod                     # → reporter database_id dans wrangler.jsonc (env.production)
wrangler kv namespace create bayt-cache          # → reporter l'id
wrangler queues create bayt-ingestion
```

### Secrets

Jamais commités. En local : `apps/api/.dev.vars` (git-ignoré, cf. `.dev.vars.example`).
En production :

```bash
cd apps/api
# secret de signature des sessions (32 octets aléatoires)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))" \
  | wrangler secret put BETTER_AUTH_SECRET --env production
```

### Déployer l'API

```bash
cd apps/api
wrangler d1 migrations apply bayt-prod --remote --env production   # schéma
wrangler d1 execute bayt-prod --remote --env production --file=./seed/demo.sql   # contenu de départ
wrangler deploy --env production
```

Les URLs de prod (`vars` de `env.production` dans `apps/api/wrangler.jsonc`) :
`BETTER_AUTH_URL=https://api.bayt.app`, `WEB_ORIGIN=https://bayt.app` (CORS verrouillé
dessus, pas de wildcard), `COOKIE_DOMAIN=.bayt.app`.

### Déployer le front

`NEXT_PUBLIC_API_URL` est **figé au build** (bundle client) :

```bash
cd apps/web
NEXT_PUBLIC_API_URL=https://api.bayt.app pnpm exec opennextjs-cloudflare build
wrangler deploy
```

### Domaines personnalisés (dashboard)

Une fois les Workers déployés, dans **Cloudflare → Workers & Pages** :

- `bayt-api-production` → **Custom Domains** → ajouter `api.bayt.app`
- `bayt-web-production` → **Custom Domains** → ajouter `bayt.app` (apex)
- `www.bayt.app` → une **Redirect Rule** vers `https://bayt.app` (301)

La zone `bayt.app` doit être active sur le compte ; Cloudflare crée les
enregistrements DNS et le certificat automatiquement.

## Structure (cible)

```
apps/
  web/            # Next.js
  api/            # Workers / Hono
packages/
  domain/         # Logique métier pure (cœur DDD, testable)
  ui/             # Composants shadcn/ui partagés
  config/         # TS / lint / tokens de design
docs/
  bayt-fondations.md   # Carte des contextes DDD, agrégats, décisions d'archi
CLAUDE.md         # Contrat de comportement (lu par Claude Code)
lessons.md        # Mémoire cumulative des sessions
```

## Documents clés

- **`docs/bayt-fondations.md`** — le socle : contextes bornés, agrégats du cœur (Learning Engine / FSRS), mapping Cloudflare, première tranche verticale.
- **`lessons.md`** — mémoire cumulative. Une leçon par entrée, ajoutée à la fin de chaque session.
- **`CLAUDE.md`** — règles non négociables + conventions, lu automatiquement par Claude Code au démarrage.

## Statut

🚧 Monorepo pnpm en place (squelettes valides, aucune logique métier). Prochaine étape : moteur FSRS pur dans `packages/domain` (avec tests), puis intégration Next.js / Hono / Cloudflare.
