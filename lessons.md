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

**L019 — La syntaxe cloze brute ne doit jamais atteindre l'écran.**
`{{c1::réponse}}` / `{{c1::réponse::indice}}` sont analysés par `parseCloze` (`apps/web/src/lib/cloze.ts`, testé) — jamais inline dans le composant. Recto = blanc/pastille (indice si présent), verso = réponse en vert gras. Piège : une regex `/…/g` **partagée** garde son `lastIndex` entre `.test()` et `.matchAll()` → analyse corrompue. Fabriquer une regex fraîche à chaque appel.

**L020 — Les PNG de la mascotte doivent être à fond transparent (alpha réel).**
`apps/web/public/mascot/{idle,celebrating}.png` sont actuellement **opaques** (PNG color type 2, RGB sans canal alpha) → carré blanc visible, surtout en Dark Mode. Le composant `Mascot` n'ajoute plus ni fond ni cadre : il faut fournir de vrais PNG détourés (RGBA). Ne pas retoucher les images soi-même sans le dire. Vérif rapide : `sips -g hasAlpha fichier.png`.

**L021 — Une leçon d'exercices = une surcouche de la boucle FSRS, jamais un système parallèle.**
Chaque réponse d'exercice se traduit en note FSRS et passe par `SubmitReview` (l'API de révision existante). Mapping **assumé** : faux → `Again` ; juste après un essai raté ou un indice → `Hard` ; juste du premier coup → `Good` (jamais `Easy` — on réserve le plus long intervalle à la révision libre). Le domaine possède les types d'exercices (QCM, texte à trous, association), leur correction déterministe (`checkAnswer`, pure, testée) et `gradeForOutcome` ; la séquence (remise en fin de file d'un exercice raté) est orchestrée par l'UI, comme la révision.

**L022 — Pas de cœurs ni de vies : se tromper fait partie de l'apprentissage.**
Choix pédagogique explicite (retrieval practice) : un exercice raté **revient en fin de file jusqu'à réussite**, sans pénalité de « vie ». L'erreur est un signal d'ancrage, pas une sanction. La progression compte les exercices réussis / total.

**L023 — Les solutions ne quittent jamais l'API de lecture d'une leçon.**
`GET /lessons/:id` renvoie les exercices **sans** `answerIndex`/`answer`/appariement correct ; pour une association, les côtés « droit » sont **mélangés** (Fisher-Yates dans le présentateur). La correction n'arrive qu'en réponse à `POST /lessons/:id/answers`. Verrouillé par un test HTTP (« ne divulgue jamais les solutions »).

**L024 — Gamification : motivation, jamais un pilote de la mémoire.**
XP / série / objectif quotidien vivent dans `packages/domain/src/gamification/` (purs, testés) et dans une table `user_progress` distincte. Ils n'influencent **jamais** FSRS. XP : exercice réussi = 10, carte révisée = 4/6/8/10 selon Again/Hard/Good/Easy. Le montant est calculé par le domaine (`xpForEvent`) à partir d'un **événement** envoyé à `POST /progress/increment` — le client ne dicte pas un montant arbitraire.

**L025 — Série robuste au fuseau : le « jour » se calcule dans le fuseau de l'apprenant.**
`localDay(now, timeZone)` (Intl, repli UTC) donne le jour local ; la série se prolonge sur un jour consécutif et se rompt dès qu'un jour est manqué. `lastGoalDay` est stocké pour juger la vivacité **à la lecture** (`currentStreak`/`dailyStatus`) sans écrire en base. `now` est toujours un paramètre explicite (jamais `Date.now()`), donc déterministe et testable.

**L026 — Pas de cœurs ni de vies (rappel, appliqué à la gamification).**
On récompense l'effort (XP, flamme, objectif), on ne punit jamais l'erreur par une « vie » perdue. Célébrations spéciales quand l'objectif du jour est atteint et quand la série augmente.

**L027 — Accueil = carte « Réviser » + chemin à nœuds (route `/`).**
`/` est le point d'entrée (plus de redirect). Une **unité** (`units`) groupe des leçons ordonnées (`lessons.unit_id`/`position`) ; la complétion est persistée dans `lesson_progress` (`GET /path`, `POST /lessons/:id/complete`, zod). États des nœuds calculés purement (`assignNodeStates`, testé) : terminé / **une seule** disponible (la 1re non terminée) / verrouillé. Une leçon terminée débloque la suivante — la complétion est écrite à la fin de la leçon (`useCompleteLesson`).

**L028 — Serpentin : décalage horizontal + colonne centrale, pas de trig fragile.**
Nœuds empilés, décalés en `translateX` selon `index % 4` (centre/droite/centre/gauche) au-dessus d'une colonne centrale (le « chemin »). Robuste et responsive, sans connecteurs à angle calculé. Nœud disponible = pulsation (Framer Motion, coupée en `reduced-motion`) + badge « COMMENCER » ; verrouillé = non cliquable ; état annoncé via `aria-label` + `aria-current="step"`.

**L029 — Ingestion : R2 (source) + Queue (async) + agent LLM + D1, tout en `apps/api`.**
`POST /documents` stocke le brut dans R2, crée la ligne document (`pending`), pousse un message et répond (202) — chemin critique court. Le `queue()` consumer fait R2 → extraction → `splitIntoSections` → agent → `learning_items` (`source_ref='doc:<id>'`) → `ready`/`failed` (motif). Le domaine reste **pur** : tout le pipeline (extraction, LLM, découpage) vit dans `apps/api/src/ingestion`. Local complet sans compte Cloudflare : R2 + Queues simulés par `wrangler dev`.

**L030 — L'agent est provider-agnostique ; sortie LLM strictement validée + retentée.**
`LLMProvider` (interface) → `WorkersAiProvider` (premier, binding `AI`) ou `HeuristicProvider` (fallback local hors ligne). `CardGenerator` construit le prompt, valide la sortie par zod (`{cards:[{front,back}]}`), **retente** sur JSON invalide puis échoue (`CardGenerationError`), et **déduplique** via `normalizeText` du domaine. Piège rencontré : un provider naïf peut générer depuis les consignes du prompt — délimiter l'extrait (`"""…"""`) et n'en extraire que ce bloc.

**L031 — Sans abonnement R2 : le texte extrait vit dans D1, derrière `DocumentStorage`.**
R2 exige d'activer l'abonnement (palier gratuit, mais carte requise) — indisponible pour l'instant. Choix de transition : on **n'stocke plus le fichier brut** ; l'extraction du texte se fait **à la réception** (`SubmitDocument`, avant la file), et le **texte extrait** est persité dans D1 (`documents.extracted_text`) via le port **`DocumentStorage`** (impl. `D1DocumentStorage` aujourd'hui). Le message de Queue ne porte que l'`id` (jamais le texte → sous la limite de taille des messages) ; le consumer relit le texte depuis D1. **R2 reste la cible** quand l'abonnement sera actif : il suffira d'ajouter une impl. `R2DocumentStorage` + le binding, sans toucher au pipeline (cas d'usage et routes ne connaissent que le port). Binding R2 retiré de `wrangler.jsonc` pour que le déploiement passe. Conséquence : une extraction ratée (ex. PDF sans texte) crée directement un document `failed` dès la réception.

**L005 — Convention de cette mémoire.**
Une leçon = une entrée courte et actionnable. Noter le nouveau et le confirmé, pas le déjà-écrit. Mettre à jour une leçon plutôt que la dupliquer.
