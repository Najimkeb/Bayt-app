import { describe, expect, it } from 'vitest';

import { CATALOG_DOMAINS, DOMAIN_COLORS } from '../../src/catalog/index.js';

describe('CATALOG_DOMAINS', () => {
  it('déclare les 11 domaines attendus', () => {
    expect(CATALOG_DOMAINS).toHaveLength(11);
    expect(CATALOG_DOMAINS[0]?.id).toBe('dom_apprendre');
    expect(CATALOG_DOMAINS.map((d) => d.name)).toContain('RGPD & protection des données');
  });

  it('a des identifiants uniques', () => {
    const ids = new Set(CATALOG_DOMAINS.map((d) => d.id));
    expect(ids.size).toBe(CATALOG_DOMAINS.length);
  });

  it('a des rangs d’affichage 0..n uniques et contigus', () => {
    const orders = CATALOG_DOMAINS.map((d) => d.order).sort((a, b) => a - b);
    expect(orders).toEqual([...Array(CATALOG_DOMAINS.length).keys()]);
  });

  it('n’utilise que des couleurs d’accent connues et un emoji non vide', () => {
    for (const domain of CATALOG_DOMAINS) {
      expect(DOMAIN_COLORS).toContain(domain.color);
      expect(domain.emoji.length).toBeGreaterThan(0);
      expect(domain.description.length).toBeGreaterThan(0);
    }
  });
});
