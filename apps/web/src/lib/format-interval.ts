/**
 * Formatage des intervalles de revision, en francais et en langage humain.
 *
 * On arrondit volontairement : « 3 j » porte l'information utile, « 3 j 4 h
 * 12 min » ne fait qu'ajouter du bruit sous un bouton.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatInterval(intervalMs: number): string {
  if (intervalMs < MINUTE) {
    return '< 1 min';
  }

  if (intervalMs < HOUR) {
    return `${String(Math.round(intervalMs / MINUTE))} min`;
  }

  if (intervalMs < DAY) {
    return `${String(Math.round(intervalMs / HOUR))} h`;
  }

  if (intervalMs < MONTH) {
    return `${String(Math.round(intervalMs / DAY))} j`;
  }

  if (intervalMs < YEAR) {
    return `${String(Math.round(intervalMs / MONTH))} mois`;
  }

  const years = intervalMs / YEAR;

  return `${years < 10 ? years.toFixed(1) : String(Math.round(years))} ans`;
}

/** Version longue, pour les lecteurs d'ecran (`aria-label`). */
export function formatIntervalLong(intervalMs: number): string {
  const short = formatInterval(intervalMs);

  return short
    .replace('< 1 min', 'moins d\'une minute')
    .replace(/(\d+) min/, '$1 minutes')
    .replace(/(\d+) h/, '$1 heures')
    .replace(/(\d+) j/, '$1 jours');
}
