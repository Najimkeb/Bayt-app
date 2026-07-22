import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as domain from '../../src/index.js';

const SRC_DIR = fileURLToPath(new URL('../../src', import.meta.url));

/** Seul fichier autorise a connaitre `ts-fsrs`. */
const ADAPTER = 'scheduling/ts-fsrs.adapter.ts';

/**
 * Le moteur de calcul est un detail d'implementation. Ces tests verrouillent la
 * frontiere anti-corruption : si un import de `ts-fsrs` fuit hors de
 * l'adaptateur, la suite echoue (cf. lessons.md L007).
 */
describe('@bayt/domain — encapsulation de ts-fsrs', () => {
  const sources = listTypeScriptFiles(SRC_DIR);

  it('couvre bien l\'ensemble des sources du domaine', () => {
    expect(sources.length).toBeGreaterThan(3);
    expect(sources).toContain(ADAPTER);
  });

  it('n\'importe `ts-fsrs` que depuis l\'adaptateur', () => {
    const importsTsFsrs = /from\s+['"]ts-fsrs['"]/;
    const offenders = sources.filter(
      (file) => file !== ADAPTER && importsTsFsrs.test(readFileSync(join(SRC_DIR, file), 'utf8')),
    );

    expect(offenders).toEqual([]);
  });

  it('l\'adaptateur n\'expose que la fabrique du moteur', () => {
    const adapter = readFileSync(join(SRC_DIR, ADAPTER), 'utf8');
    const exported = [...adapter.matchAll(/^export (?:function|const|class) (\w+)/gm)].map(
      (match) => match[1],
    );

    expect(exported).toEqual(['createFsrsEngine']);
  });

  it('n\'expose ni l\'adaptateur ni le vocabulaire de ts-fsrs', () => {
    const exported = Object.keys(domain);

    expect(exported).not.toContain('Rating');
    expect(exported).not.toContain('State');
    expect(exported.filter((name) => name.toLowerCase().includes('fsrs'))).toEqual([]);
  });
});

/** Liste recursivement les fichiers `.ts` d'un dossier, en chemins relatifs. */
function listTypeScriptFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;

    if (entry.isDirectory()) {
      return listTypeScriptFiles(join(dir, entry.name), relative);
    }

    return entry.name.endsWith('.ts') ? [relative] : [];
  });
}
