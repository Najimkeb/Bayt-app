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

BAYT est déployé en **deux Workers** sur `*.workers.dev` (sans domaine personnalisé) :

| Worker | Rôle | URL |
|--------|------|-----|
| `bayt-web-production` | Front Next.js (adaptateur **OpenNext**) | `https://bayt-web-production.<compte>.workers.dev` |
| `bayt-api-production` | API Hono + auth | (privé — joint via Service Binding) |

**Montage « même origine ».** Deux sous-domaines `*.workers.dev` sont *cross-site* :
un cookie de session posé par l'API ne serait pas partagé avec le front (déconnexion
en boucle). On sert donc l'API **sous l'origine du front** : le navigateur ne parle
qu'au front, qui relaie `/api/*` vers le Worker API.

- Le proxy est un **Route Handler** (`apps/web/src/app/api/[...path]/route.ts`), **pas**
  un `rewrites()` Next (OpenNext ne proxifie pas les rewrites externes).
- Il appelle l'API par un **Service Binding** (`API` → `bayt-api-production`), car deux
  Workers d'un même `*.workers.dev` ne peuvent pas se joindre par leur URL publique
  (erreur 1042).
- Better Auth : `baseURL`/`trustedOrigins` = l'URL du front ; cookie **host-only**
  (`Secure`, `SameSite=Lax`, **sans `Domain=`**) → **first-party** sur le front.

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

Les `vars` de `env.production` (dans `apps/api/wrangler.jsonc`) pointent sur **l'URL
du front** (origine publique vue par le navigateur) :
`BETTER_AUTH_URL=WEB_ORIGIN=https://bayt-web-production.<compte>.workers.dev`.
**Pas de `COOKIE_DOMAIN`** → cookie host-only (first-party). Aucune référence à un
domaine personnalisé.

### Déployer le front

`NEXT_PUBLIC_API_URL=/api` est **figé au build** (chemin relatif → proxy même origine) :

```bash
cd apps/web
NEXT_PUBLIC_API_URL=/api pnpm exec opennextjs-cloudflare build
wrangler deploy   # Service Binding `API` → bayt-api-production (cf. wrangler.jsonc)
```

En **local** (`pnpm dev`), `NEXT_PUBLIC_API_URL` n'est pas défini → le front vise
directement `http://localhost:8787` (CORS), sans proxy.

### PWA (écran d'accueil iPhone)

Manifest (`apps/web/src/app/manifest.ts`, `display: standalone`) + balises iOS
(`appleWebApp` dans `layout.tsx`) → l'app s'ouvre **plein écran**, sans barre Safari.
Icônes (`public/{apple-touch-icon,icon-192,icon-512}.png`) à **fond plein** — iOS
rend la transparence en noir, donc jamais de PNG transparent. Régénérées depuis la
mascotte via un petit script PIL (fond vert de la charte).

### URL publique

**https://bayt-web-production.najimkeb31.workers.dev**

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
