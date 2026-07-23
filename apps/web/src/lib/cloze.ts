/**
 * Analyse de la syntaxe cloze (« texte à trous ».)
 *
 * Format supporté, aligné sur Anki :
 * - `{{c1::réponse}}` — un trou ;
 * - `{{c1::réponse::indice}}` — un trou avec indice affiché à la place du blanc ;
 * - plusieurs trous dans le même texte.
 *
 * La syntaxe brute ne doit **jamais** atteindre l'écran : cette fonction la
 * transforme en segments structurés que le composant rend, soit en blanc
 * (recto), soit avec la réponse mise en valeur (verso).
 */

/** Un morceau de texte ordinaire, hors de tout trou. */
export interface ClozeTextSegment {
  readonly kind: 'text';
  readonly value: string;
}

/** Un trou : sa réponse, un éventuel indice, et son numéro de groupe. */
export interface ClozeBlankSegment {
  readonly kind: 'blank';
  /** Réponse cachée (affichée au verso). */
  readonly answer: string;
  /** Indice optionnel (affiché à la place du blanc, au recto). */
  readonly hint: string | null;
  /** Numéro du groupe cloze (`c1` → 1). */
  readonly group: number;
}

export type ClozeSegment = ClozeTextSegment | ClozeBlankSegment;

/**
 * `{{c<n>::réponse}}` ou `{{c<n>::réponse::indice}}`.
 *
 * Fabriquée à chaque appel : une regex `g` partagée conserve son `lastIndex`
 * entre `test()` et `matchAll()`, ce qui corromprait l'analyse.
 */
function clozePattern(): RegExp {
  return /\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g;
}

/**
 * Découpe un texte cloze en segments.
 *
 * Un texte sans trou renvoie un unique segment `text` : la fonction est donc
 * sûre à appeler sur n'importe quel contenu.
 */
export function parseCloze(text: string): ClozeSegment[] {
  const segments: ClozeSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(clozePattern())) {
    const start = match.index;

    if (start > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, start) });
    }

    const group = Number.parseInt(match[1] ?? '0', 10);
    const answer = (match[2] ?? '').trim();
    const rawHint = match[3];
    const hint = rawHint !== undefined && rawHint.trim() !== '' ? rawHint.trim() : null;

    segments.push({ kind: 'blank', answer, hint, group });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

/** Indique si un texte contient au moins un trou cloze. */
export function hasCloze(text: string): boolean {
  return clozePattern().test(text);
}

/**
 * Version « pleine » d'un texte cloze : chaque trou remplacé par sa réponse.
 *
 * Utile comme repli textuel (ex. `aria-label`) : aucune syntaxe brute, juste la
 * phrase complète.
 */
export function fillCloze(text: string): string {
  return parseCloze(text)
    .map((segment) => (segment.kind === 'text' ? segment.value : segment.answer))
    .join('');
}
