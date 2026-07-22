# BAYT — Fondations d'architecture & de domaine

> Document socle. Toute décision ultérieure s'appuie dessus. Version itérative (v0.1).
> Principe directeur : **domaine d'abord, validé par une tranche verticale** — jamais de scaffolding à l'aveugle ni d'architecture-astronaute.

---

## 1. Séquence de démarrage recommandée

| Phase | Objet | Pourquoi maintenant |
|-------|-------|---------------------|
| **0. Domaine** (ce doc) | Langage commun + contextes bornés + agrégats du cœur | Décision la moins chère à corriger maintenant, la plus chère à rétrofiter plus tard. Contraint le schéma D1, l'API, les responsabilités des agents et la structure du repo. |
| **1. Tranche verticale « Réviser une carte »** | D1 + Worker Hono + logique FSRS + écran Next.js | Prouve toute la stack imposée d'un coup. Dé-risque la décision pédagogique la plus lourde (SRS) avant de construire par-dessus. |
| **2. Fondations repo** | Monorepo pnpm, `packages/domain` pur, conventions | Se décide *après* qu'on sait ce que le domaine contient. |
| **3+** | Ingestion de connaissances, agents IA, gamification étendue | Chacune arrive comme sa propre tranche verticale. |

**Règle** : chaque nouvelle capacité entre par une tranche verticale (UI → API → domaine → persistance), pas par couche horizontale.

---

## 2. Carte des contextes bornés (DDD)

BAYT n'est pas un monolithe de fonctionnalités : c'est un ensemble de contextes avec un langage propre. Chaque contexte est mappé délibérément sur une primitive Cloudflare — **on n'introduit jamais une primitive sans un besoin métier clair.**

### 2.1 Learning Engine — *le cœur*
La boucle de mémorisation : Active Recall, Retrieval Practice, Spaced Repetition.
- Agrégats : `LearningItem`, `SchedulingState`, `ReviewLog`.
- Héberge l'algorithme **FSRS**.
- Cloudflare : **D1** (persistance), **Durable Object** (`ReviewSession` par user, v1.1 — état de session live + verrou anti-course), **KV** (compteur de cartes dues en cache).

### 2.2 Knowledge Ingestion
Transforme les documents fournis (PDF, Word, Excel, PowerPoint, images, Markdown) en items révisables.
- Cloudflare : **R2** (stockage des sources brutes), **Queues** (traitement asynchrone — extraction lourde hors du chemin critique), **Workers AI** (embeddings, extraction rapide), **Claude / OpenAI** (génération de cartes de qualité), **Vectorize** (indexation sémantique).

### 2.3 AI Tutoring & Agents
L'équipe d'agents spécialisés qui collaborent :
- *Générateur de cartes* (doc → flashcards / cloze / cas pratiques)
- *Correcteur Feynman* (l'user explique → l'agent évalue la compréhension)
- *Évaluateur Bloom* (classe la maîtrise : mémoriser → comprendre → appliquer → analyser…)
- *Planificateur de parcours* (interleaving, séquencement)
- *Mascotte / Mentor BAYT* (feedback bienveillant, jamais infantilisant)
- Cloudflare : orchestration côté **Workers**, **Vectorize** pour le contexte récupéré, providers interchangeables (Claude / OpenAI / Workers AI).

### 2.4 Gamification & Progression
XP, streaks, ligues, badges, objectifs.
- Cloudflare : **Durable Object** par user (état temps réel : streak, XP du jour — évite les races), **D1** (historique agrégé).

### 2.5 Identity & Access
Comptes, sessions, abonnements (SaaS premium — billing plus tard).
- Cloudflare : **D1** (utilisateurs), **KV** (sessions / cache). *Choix du provider d'auth à trancher (voir §6).*

### 2.6 Content Catalog & Curriculum
Domaines, parcours, compétences, politique d'interleaving, mapping taxonomie de Bloom.
- Cloudflare : **D1**.

---

## 3. Le cœur en détail — agrégats de la boucle de révision

Vocabulaire commun (ubiquitous language) — à respecter dans le code, l'UI et les échanges :

### `LearningItem`
L'atome révisable.
- `id`, `type` (`flashcard` | `cloze` | `practice_case`)
- `front` / `back` (ou `prompt` / `answer`)
- `source_ref` (d'où il vient : doc ingéré, création manuelle…)
- rattaché à une `KnowledgeUnit` / `Deck`

### `SchedulingState` — *par (user, item)*
L'état mémoire FSRS. **C'est ici que vit la promesse produit.**
- `stability` (durée avant que le rappel tombe sous le seuil)
- `difficulty`
- `state` (`New` | `Learning` | `Review` | `Relearning`)
- `due_at`
- `last_reviewed_at`
- `retrievability` (probabilité de rappel calculée à un instant t)

### `ReviewLog` — *append-only*
Chaque révision est enregistrée, **jamais écrasée**. C'est la matière première pour :
1. l'optimisation des paramètres FSRS **par utilisateur**,
2. les analytics de progression,
3. la gamification (streaks, XP).
- `user_id`, `item_id`, `grade` (`Again` | `Hard` | `Good` | `Easy`), `reviewed_at`, `elapsed_ms`, `state_before` → `state_after`.

> **Décision** : on stocke des logs riches dès le jour 1, même si la tranche v1 n'exploite pas encore l'optimisation par user. Rétrofiter des logs manquants est impossible.

---

## 4. Choix SRS : FSRS vs SM-2

| Critère | SM-2 | **FSRS (retenu)** |
|--------|------|-------------------|
| Modèle mémoire | Formule fixe, ignore la proba réelle de rappel | `stabilité` + `difficulté`, prédit la `retrievability` |
| Rétention | Subie (sur/sous-planifie) | **Ciblée** (ex. 90 %) — pilotage explicite du compromis effort/oubli |
| Personnalisation | Aucune | Paramètres **optimisables par user** depuis ses `ReviewLog` |
| Maturité | Vieillissant | État de l'art, open-source MIT, défaut Anki actuel |
| Implémentation | Triviale | Déterministe, rapide, implémentable en TS pur dans un Worker |

**Coût assumé** : état plus riche + logs détaillés à persister dès le départ.
**Bénéfice** : plus gros levier sur « mémorisation long terme », scalable à des centaines de milliers d'users. Aligné « qualité > rapidité de dev ».

---

## 5. Tranche verticale n°1 — « Réviser une carte »

**Parcours utilisateur** : ouvrir l'app → voir les cartes dues → révéler la réponse → noter (4 boutons) → FSRS replanifie → progression/streak se mettent à jour → la mascotte encourage.

**Ce que ça prouve** : D1 + Worker Hono + domaine FSRS pur + UI Next.js + un avant-goût de gamification.
**Ce que ça exclut volontairement** : ingestion de docs, agents, catalogue. On expédie d'abord le cœur.

Mapping Cloudflare de la tranche :
- **D1** : tables `learning_items`, `scheduling_state`, `review_logs`. Index `(user_id, due_at)` pour la file des cartes dues.
- **Worker + Hono** :
  - `GET /reviews/queue` → items dus pour l'user
  - `POST /reviews` → reçoit une note, recalcule l'état FSRS, persiste le log + le nouveau `due_at`
- **`packages/domain`** : moteur FSRS **pur** (aucune dépendance Cloudflare/Next), testable en isolation. Entrée : `(SchedulingState, grade, now)` → sortie : `nouvel SchedulingState`.
- **Next.js + Framer Motion** : écran de révision (carte → flip → 4 boutons), mascotte réactive.
- **Durable Object `ReviewSession`** : reporté en v1.1 (v1 : état de session côté client + D1 suffit).

---

## 6. Hypothèses posées (non bloquantes) & questions ouvertes

**Hypothèses de travail** (dis-moi si l'une est fausse) :
- B2C, modèle freemium ; billing traité plus tard.
- Multi-domaine, contenu potentiellement multilingue ; UI en FR d'abord.
- On démarre par `flashcard` / `cloze` ; cas pratiques & projets réels viennent ensuite.
- **Monorepo pnpm** :
  - `apps/web` — Next.js
  - `apps/api` — Workers / Hono
  - `packages/domain` — logique métier pure (cœur DDD, framework-agnostic)
  - `packages/ui` — composants shadcn/ui partagés
  - `packages/config` — TypeScript / lint / tokens de design

**À trancher prochainement** :
1. Rétention cible FSRS par défaut (proposition : **90 %**).
2. Domaines de lancement prioritaires (oriente le catalogue et les premiers jeux de cartes de démo).
3. Provider d'auth : Cloudflare Access, Clerk, ou custom sur D1 (je ferai une reco comparée).

---

*Prochaine étape logique : geler ce socle → poser le monorepo (Phase 2) → coder le moteur FSRS pur dans `packages/domain` avec ses tests, avant toute UI.*
