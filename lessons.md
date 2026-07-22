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

**L005 — Convention de cette mémoire.**
Une leçon = une entrée courte et actionnable. Noter le nouveau et le confirmé, pas le déjà-écrit. Mettre à jour une leçon plutôt que la dupliquer.
