/**
 * Nettoie les **tirets cadratins** (« — », U+2014) et **demi-cadratins**
 * (« – », U+2013) utilisés comme ponctuation par les modèles, un tic d'écriture
 * qui alourdit la lecture. On les remplace par une ponctuation simple.
 *
 * **Ne touche JAMAIS au trait d'union** « - » (U+002D) : les mots composés
 * (« peut-être », « rendez-vous ») sont préservés. Seuls les cadratins/demi-
 * cadratins isolés servant de ponctuation sont ciblés.
 *
 * À appliquer côté serveur sur tout texte de carte/leçon/vocabulaire produit
 * par l'IA, avant insertion en base (double filet avec la consigne système).
 */

/** Cadratin (—) ou demi-cadratin (–). Jamais le trait d'union (-). */
const DASHES = /[—–]/;

export function cleanDashes(text: string): string {
  // Chemin rapide : la grande majorité des textes n'a aucun cadratin.
  if (!DASHES.test(text)) {
    return text;
  }

  let out = text
    // 1. Tiret juste après une ponctuation forte, SUR LA MÊME LIGNE → on garde
    //    la ponctuation. « Fin. — Ensuite » → « Fin. Ensuite »
    .replace(/([.!?:;])[ \t]*[—–][ \t]*/g, '$1 ')
    // 2. Tiret en tête de ligne (liste, dialogue) → retiré.
    .replace(/(^|\n)[ \t]*[—–][ \t]*/g, '$1')
    // 3. Tiret en fin de ligne → retiré.
    .replace(/[ \t]*[—–][ \t]*($|\n)/g, '$1')
    // 4. Tiret entouré d'espaces (incise, pause) → virgule.
    //    « Paris — la capitale » → « Paris, la capitale »
    .replace(/[ \t]+[—–][ \t]+/g, ', ')
    // 5. Tiret collé entre deux caractères → virgule + espace.
    //    « mot—autre » → « mot, autre »
    .replace(/(\S)[—–](\S)/g, '$1, $2')
    // 6. Tout tiret restant (cas résiduels) → virgule + espace.
    .replace(/[—–]/g, ', ');

  // Normalisation. On ne touche PAS à l'espace avant « : ; ! ? » (typographie
  // française) : on ne corrige que l'espace parasite avant une virgule/point.
  out = out
    .replace(/[ \t]+([,.])/g, '$1') // pas d'espace avant une virgule/point
    .replace(/,(\s*,)+/g, ',') // virgules en double
    .replace(/[ \t]{2,}/g, ' '); // espaces multiples

  return out.trim();
}
