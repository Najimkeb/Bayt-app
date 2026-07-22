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

**L005 — Convention de cette mémoire.**
Une leçon = une entrée courte et actionnable. Noter le nouveau et le confirmé, pas le déjà-écrit. Mettre à jour une leçon plutôt que la dupliquer.
