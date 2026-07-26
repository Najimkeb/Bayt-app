import { getTableColumns, type Table } from 'drizzle-orm';

/**
 * Découpage des inserts multi-lignes pour rester sous la limite de **variables
 * liées** de D1.
 *
 * D1 plafonne le nombre de paramètres `?` à **100 par requête** ; au-delà,
 * l'insert échoue avec « too many SQL variables ». Un insert de N lignes lie
 * `N × (colonnes)` variables — le nombre de lignes sûres dépend donc du **nombre
 * de colonnes de la table**. On calcule la taille de lot à partir de la table
 * elle-même (via `getTableColumns`) : ajouter une colonne au schéma ajuste
 * automatiquement les lots, sans laisser un chunk codé en dur devenir dangereux
 * (c'est exactement ce qui avait cassé quand `domain_id` a été ajouté).
 */

/** Marge sous la limite D1 (100) — on vise 90 pour garder de l'air. */
export const D1_MAX_BOUND_PARAMS = 90;

/** Nombre de lignes insérables par requête pour une table, sous la limite D1. */
export function rowsPerInsert(table: Table): number {
  const columns = Object.keys(getTableColumns(table)).length;

  return Math.max(1, Math.floor(D1_MAX_BOUND_PARAMS / Math.max(1, columns)));
}

/**
 * Découpe des lignes en lots insérables sûrs pour la table donnée. Chaque lot
 * lie au plus `D1_MAX_BOUND_PARAMS` variables.
 */
export function chunkForInsert<T>(rows: readonly T[], table: Table): T[][] {
  const size = rowsPerInsert(table);
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }

  return chunks;
}
