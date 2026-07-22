# lessons.md — Mémoire cumulative BAYT

> Une leçon par entrée. On note les **corrections** et les **approches confirmées**.
> On ne sauvegarde **pas** ce que l'historique/les fichiers contiennent déjà.
> Chaque session relit ce fichier avant de démarrer : les résultats se cumulent.

---

**L001 — Domaine d'abord, ancré sur une tranche verticale.**
Ne jamais scaffolder le repo à l'aveugle ni dessiner toute l'archi sur papier. Chaque nouvelle capacité entre par une tranche verticale (UI → API → domaine → persistance), pas par couche horizontale.

**L002 — SRS = FSRS (pas SM-2).**
Cœur produit = mémorisation long terme. FSRS modélise `stabilité`/`difficulté`, cible une rétention (~90 %) et se personnalise par utilisateur. Conséquence : stocker des `ReviewLog` riches et **append-only** dès le jour 1 (rétrofiter des logs manquants est impossible).

**L003 — Logique métier dans `packages/domain`, pure.**
Aucune dépendance Cloudflare ou Next dans le domaine. Les Workers et l'UI ne font qu'orchestrer. Le moteur FSRS doit être testable en isolation : `(SchedulingState, grade, now)` → `nouvel SchedulingState`.

**L004 — Mapping Cloudflare délibéré.**
Chaque contexte borné est rattaché à une primitive pour une raison métier explicite. Ne jamais introduire une primitive (D1, R2, Vectorize, Queues, DO, KV, Workers AI…) sans besoin clairement identifié.

**L006 — Base technique du monorepo : ESM strict + NodeNext.**
Tous les paquets sont `"type": "module"`, `module`/`moduleResolution` = `NodeNext`, imports relatifs avec extension `.js`. La config stricte partagée vit dans `packages/config` (`tsconfig.base.json`, `tsconfig.react.json`) et est héritée via `@bayt/config/...`. Conséquence : `pnpm typecheck` compile d'abord `packages/*` (les apps consomment les `dist/*.d.ts`).

**L007 — FSRS : on utilise `ts-fsrs`, on ne le réécrit pas — mais on l'encapsule.**
Le calcul FSRS-6 est délégué à la librairie de référence `ts-fsrs` (maintenue, validée, alignée sur Anki) : réimplémenter l'algorithme serait du risque pur sans valeur produit. En revanche **aucun type de `ts-fsrs` ne sort de `packages/domain`** : le `Scheduler` ne dépend que du port `SchedulingEngine`, et `scheduling/ts-fsrs.adapter.ts` est le **seul** fichier autorisé à importer la librairie (invariant verrouillé par `test/scheduling/encapsulation.test.ts`). Changer de moteur = réécrire un seul fichier.

**L008 — `SchedulingState` doit inclure `learningStep`.**
Les paliers d'apprentissage court terme (minutes) font partie de l'état persistant : sans ce champ, une carte en cours d'apprentissage repartirait au premier palier à chaque rechargement. À prévoir dans le schéma D1.

**L009 — Le plafond `maximumInterval` n'est pas strict.**
FSRS applique le plafond puis force l'ordre strict des 4 boutons (`Again` < `Hard` < `Good` < `Easy`), ce qui peut dépasser le plafond de 3 jours max. Ne pas écrire de test ni de règle métier supposant un plafond dur.

**L010 — Persistance : Drizzle sur D1, et la frontière domaine ↔ base est explicite.**
Drizzle (`drizzle-orm/d1` + `drizzle-kit`) donne un schéma type-safe et des migrations SQL versionnées, sans runtime lourd — compatible Workers. La frontière : `packages/domain` ignore D1/Drizzle/Hono ; `apps/api` porte la persistance via le **port** `ReviewRepository` (implémentations D1 **et** InMemory). Les cas d'usage et l'app Hono se testent donc **sans D1 ni Worker**. Les dates sont stockées en **epoch ms** (entiers, comparables, indexables) et converties en `Date` par les mappers.

**L011 — Une carte sans ligne `scheduling_state` = carte neuve.**
Pas de pré-remplissage à l'ingestion : la file fait un LEFT JOIN et l'état FSRS est matérialisé à la **première révision**. Moins d'écritures, pas de migration de masse à chaque nouvel item, et `(user_id, due)` reste l'index de la file.

**L012 — État serveur = TanStack Query ; le front ne calcule jamais un intervalle.**
Le cache de la file **est** la session de révision : une note retire la carte du cache immédiatement (mise à jour optimiste + rollback sur erreur), donc l'enchaînement est instantané sans état local dupliqué. Les intervalles des 4 boutons viennent de `GET /reviews/preview` — jamais d'un calcul FSRS côté client. Corollaire : dev local = deux process (`pnpm dev` à la racine lance wrangler + Next en parallèle), CORS activé sur le Worker pour `localhost:3000`, URL de l'API dans `NEXT_PUBLIC_API_URL`.

**L013 — Carte retournable : la face cachée doit sortir de l'arbre d'accessibilité.**
Les deux faces coexistent dans le DOM pour le flip 3D. Sans `aria-hidden` + `inert` sur la face cachée, un lecteur d'écran annonce la réponse **avant** que l'apprenant ne la révèle — la promesse d'active recall est cassée pour ces utilisateurs. Détecté par un test composant, pas à l'œil.

**L014 — Mascotte en images, avec repli automatique sur `idle`.**
Les poses vivent dans `apps/web/public/mascot/<mood>.png` et sont déclarées dans le mapping `MASCOT_POSES` de `packages/ui` — **volontairement incomplet** : `resolvePose(mood)` retombe sur `idle` pour toute humeur sans illustration (`idle` est obligatoire par typage). Conséquence : le code produit peut déjà demander `happy` / `encouraging` avant que les dessins existent, sans condition ni garde. Ajouter une pose = déposer le PNG + une ligne dans le mapping, rien d'autre. Les images source haute résolution restent hors du repo (`~/Downloads/Bayt/mascotte-sources/`), seules les versions 512 px sont versionnées.

**L015 — `packages/ui` est une bibliothèque pour bundler, pas pour Node.**
Depuis l'usage de `next/image`, elle compile en `moduleResolution: Bundler` (Next n'expose pas `next/image` sous NodeNext) et déclare `next` / `react` / `framer-motion` en **peerDependencies** pour éviter les instances dupliquées. `tsc` préserve bien la directive `'use client'` en tête de fichier — vérifié dans `dist/`.

**L016 — Ne jamais lancer `wrangler d1 execute --local` pendant que `wrangler dev` tourne.**
Les deux processus ouvrent le même fichier SQLite : le Worker meurt au rechargement sur `SQLITE_BUSY`. Arrêter `pnpm dev` avant tout `db:reset` / `db:seed:local`.

**L017 — Direction artistique : Duolingo, comme système, pas comme décor d'écran.**
Palette Duolingo (vert #58CC02 / rouge #FF4B4B / bleu #1CB0F6 / jaune #FFC800, chacune avec sa couleur « ombre » plus foncée), typo Nunito (700/800/900), coins ~16px. Les **tokens** vivent dans `@theme` (globals.css), les **composants** dans `packages/ui` : `Button` pressable (classe `.pressable` + variables `--btn-bg/-shadow/-fg` par variante green/red/blue/yellow/gray) et `ProgressBar` chunky. L'effet 3D = `box-shadow: 0 4px 0 <ombre>` qui s'enfonce au `:active` (translate-y + ombre à 0). Nunito est chargée via `next/font/google` (fetch au build — nécessite le réseau à la compilation).

**L018 — Grade → couleur : Again rouge, Hard jaune, Good vert, Easy bleu.**
Mapping fixe des 4 boutons de notation. Feedback : flash vert sur Good/Easy, rouge sur Again/Hard (overlay décoratif `aria-hidden`, l'info reste portée par `aria-live` + la mascotte). La couleur n'est jamais le seul indice — libellé, raccourci clavier et intervalle restent lisibles (WCAG 1.4.1).

**L005 — Convention de cette mémoire.**
Une leçon = une entrée courte et actionnable. Noter le nouveau et le confirmé, pas le déjà-écrit. Mettre à jour une leçon plutôt que la dupliquer.
