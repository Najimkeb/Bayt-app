# BAYT

Plateforme d'apprentissage assistée par IA — transforme l'utilisateur en expert grâce à la **mémorisation long terme** (SRS/FSRS), une **équipe d'agents IA** et la **gamification**. Pensé comme un SaaS premium.

## Stack

| Couche | Techno |
|--------|--------|
| Infra | Cloudflare — Pages, Workers, D1, R2, KV, Vectorize, Queues, Durable Objects, Workers AI |
| Frontend | Next.js, React, TypeScript, TailwindCSS, shadcn/ui, Framer Motion |
| Backend | Hono, REST propre, architecture modulaire |

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

🚧 Fondations posées. Prochaine étape : monorepo pnpm + moteur FSRS pur dans `packages/domain` (avec tests) avant toute UI.
