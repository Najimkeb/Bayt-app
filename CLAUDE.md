# BAYT — Contrat de comportement (CLAUDE.md)

> Ce fichier est lu automatiquement au démarrage de chaque session Claude Code.
> Il contient les **règles non négociables** et les **conventions qui diffèrent des défauts**.
> Le détail (carte des contextes, agrégats, décisions) vit dans les fichiers importés en bas.

## Ce qu'est BAYT
Plateforme d'apprentissage assistée par IA. Promesse centrale : transformer l'utilisateur en expert grâce à la **mémorisation long terme**, l'IA et la gamification. Pensé comme un **SaaS premium** pour des centaines de milliers d'utilisateurs.

## Stack imposée — NON négociable
- **Infra Cloudflare uniquement** : Pages, Workers, D1, R2, KV, Vectorize, Queues, Durable Objects, Workers AI.
- **Frontend** : Next.js, React, TypeScript, TailwindCSS, shadcn/ui, Framer Motion.
- **Backend** : Hono, REST propre, architecture modulaire.
- **Interdit** sauf demande explicite : Supabase, Firebase, Vercel, ou toute autre plateforme.

## Règles d'architecture
- **Domaine d'abord, validé par une tranche verticale.** Jamais de scaffolding à l'aveugle ni d'archi-astronaute.
- Logique métier dans `packages/domain`, **pure** (aucune dépendance Cloudflare/Next). Workers et UI orchestrent seulement.
- **TypeScript strict**, SOLID, Clean Architecture, Domain Driven Design. Composants réutilisables, code documenté, zéro duplication inutile.
- Jamais de solution temporaire si une architecture pérenne est possible. **Qualité > rapidité de dev.**
- N'introduire une primitive Cloudflare que pour un besoin métier explicite.

## Principes pédagogiques (toute feature doit les servir)
Active Recall · Spaced Repetition (**FSRS**, pas SM-2) · Retrieval Practice · Feynman · Bloom · Interleaving.
Jamais de longues leçons. Privilégier : petites leçons, quiz, cas pratiques, défis, flashcards, projets réels.

## IA
Penser BAYT comme une **équipe d'agents spécialisés** qui collaborent. Chaque feature doit pouvoir utiliser Claude, OpenAI **ou** Workers AI (providers interchangeables).

## Design
Direction artistique constante, inspirations Duolingo / Babbel / Brilliant / Apple / Notion : moderne, premium, chaleureux, épuré. Toujours : animations fluides, micro-interactions, responsive, **WCAG 2.2 AA**, Dark **et** Light Mode.
**Mascotte BAYT** : toujours présente, bienveillante, rassurante, intelligente, encourageante, **jamais infantilisante**. Un mentor personnel.

## Documents fournis par l'utilisateur
PDF, Word, Excel, PowerPoint, captures, images, Markdown → toujours proposer leur intégration dans la base de connaissances BAYT.

## Convention de travail avec l'agent
Pause **uniquement** pour : les actions irréversibles, les vrais changements de périmètre, les infos que moi seul peux donner. **Sinon, continue et fais ton rapport à la fin.**

---

## Contexte détaillé (imports)
@docs/bayt-fondations.md
@lessons.md
