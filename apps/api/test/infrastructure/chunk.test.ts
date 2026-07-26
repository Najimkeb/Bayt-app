import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { D1_MAX_BOUND_PARAMS, chunkForInsert, rowsPerInsert } from '../../src/infrastructure/db/chunk.js';
import { draftCards, learningItems, reviewLogs } from '../../src/infrastructure/db/schema.js';

const columnCount = (table: Parameters<typeof getTableColumns>[0]): number =>
  Object.keys(getTableColumns(table)).length;

/** Limite dure de D1 : 100 paramètres liés par requête. */
const D1_HARD_LIMIT = 100;

describe('chunkForInsert — sous la limite de variables liées de D1', () => {
  it('learning_items : un lot ne dépasse jamais la limite', () => {
    const cols = columnCount(learningItems);
    const params = rowsPerInsert(learningItems) * cols;
    expect(params).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
    expect(params).toBeLessThan(D1_HARD_LIMIT);
  });

  it('draft_cards (nombreuses colonnes) : un lot reste sûr', () => {
    const cols = columnCount(draftCards);
    const params = rowsPerInsert(draftCards) * cols;
    expect(params).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
    expect(params).toBeLessThan(D1_HARD_LIMIT);
  });

  it('review_logs (beaucoup de colonnes) : un lot reste sûr', () => {
    const cols = columnCount(reviewLogs);
    expect(rowsPerInsert(reviewLogs) * cols).toBeLessThan(D1_HARD_LIMIT);
  });

  it('découpe 45 lignes sans en perdre, chaque lot borné', () => {
    const rows = Array.from({ length: 45 }, (_v, i) => i);
    const chunks = chunkForInsert(rows, learningItems);
    const size = rowsPerInsert(learningItems);

    // Aucun lot trop grand.
    for (const chunk of chunks) {
      expect(chunk.length).toBeGreaterThan(0);
      expect(chunk.length).toBeLessThanOrEqual(size);
    }
    // Rien n'est perdu ni dupliqué.
    expect(chunks.flat()).toEqual(rows);
  });

  it('la taille de lot s’adapte au nombre de colonnes (plus de colonnes → lots plus petits)', () => {
    expect(rowsPerInsert(draftCards)).toBeLessThan(rowsPerInsert(learningItems));
  });
});
