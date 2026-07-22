import { describe, expect, it } from 'vitest';

import { DOMAIN_VERSION } from '../src/index.js';

describe('@bayt/domain', () => {
  it('expose une version de contrat de domaine', () => {
    expect(DOMAIN_VERSION).toBe('0.1.0');
  });
});
