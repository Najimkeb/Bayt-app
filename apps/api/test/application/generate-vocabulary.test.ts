import { describe, expect, it } from 'vitest';

import type { LLMCompletion, LLMProvider } from '../../src/ingestion/llm/provider.js';
import { VocabularyGenerator } from '../../src/ingestion/vocab/vocabulary-generator.js';
import { findTranche } from '../../src/ingestion/vocab/tranches.js';
import {
  RunVocabularyGeneration,
  StartVocabularyGeneration,
} from '../../src/application/use-cases/generate-vocabulary.js';
import { InMemoryLessonDraftRepository } from '../../src/infrastructure/repositories/in-memory-lesson-draft.repository.js';
import { InMemoryIngestionQueue } from '../../src/infrastructure/queue/cf-ingestion-queue.js';

/** Provider factice : sert des réponses JSON préprogrammées, dans l'ordre. */
class ScriptedProvider implements LLMProvider {
  private index = 0;
  public readonly prompts: string[] = [];

  public constructor(private readonly responses: readonly string[]) {}

  public complete(input: LLMCompletion): Promise<string> {
    this.prompts.push(input.user);
    const response = this.responses[this.index] ?? '{"words":[]}';
    this.index += 1;

    return Promise.resolve(response);
  }
}

function batch(words: readonly string[]): string {
  return JSON.stringify({
    words: words.map((w) => ({
      word: w,
      translation: `trad de ${w}`,
      category: 'nom',
      example: `An example with ${w}.`,
      exampleTranslation: `Un exemple avec ${w}.`,
    })),
  });
}

const TRANCHE = findTranche('1-100')!;
const DOMAIN = 'dom_anglais';
const CLOCK = () => new Date('2026-07-26T12:00:00Z');

/** Prépare Start (file) + Run (consumer) sur un même dépôt. */
function setup(responses: readonly string[], maxCalls = 1) {
  const drafts = new InMemoryLessonDraftRepository();
  const queue = new InMemoryIngestionQueue();
  const start = new StartVocabularyGeneration(drafts, queue, CLOCK);
  const generator = new VocabularyGenerator(new ScriptedProvider(responses));
  const run = new RunVocabularyGeneration(generator, drafts, CLOCK, undefined, maxCalls);

  return { drafts, queue, start, run };
}

function seedExisting(drafts: InMemoryLessonDraftRepository, words: readonly string[]): void {
  drafts.published.push(
    ...words.map((w, i) => ({
      id: `existing-${String(i)}`,
      type: 'flashcard' as const,
      front: w,
      back: 'x',
      sourceRef: 'seed',
      domainId: DOMAIN,
      createdAt: 0,
    })),
  );
}

describe('StartVocabularyGeneration', () => {
  it('crée un brouillon vide en « generating » et met le job en file', async () => {
    const { drafts, queue, start } = setup([]);

    const { draftId } = await start.execute({ tranche: TRANCHE, domainId: DOMAIN, createdBy: 'admin' });

    const found = await drafts.findDraft(draftId);
    expect(found?.draft.status).toBe('generating');
    expect(found?.cards).toHaveLength(0); // vide : le consumer remplira
    expect(queue.sent).toEqual([
      { kind: 'vocab', draftId, tranche: '1-100', domainId: DOMAIN },
    ]);
  });
});

/** Enchaîne Start puis Run (comme le ferait le consumer) pour un scénario. */
async function startThenRun(
  s: ReturnType<typeof setup>,
  createdBy = 'admin',
): Promise<{ draftId: string; result: Awaited<ReturnType<typeof s.run.execute>> }> {
  const { draftId } = await s.start.execute({ tranche: TRANCHE, domainId: DOMAIN, createdBy });
  const result = await s.run.execute({ draftId, tranche: TRANCHE, domainId: DOMAIN });

  return { draftId, result };
}

describe('RunVocabularyGeneration', () => {
  it('finalise le brouillon en « draft » et ignore les mots déjà connus', async () => {
    const s = setup([batch(['the', 'be', 'to'])]);
    seedExisting(s.drafts, ['the']);

    const { draftId, result } = await startThenRun(s);

    expect(result).toMatchObject({ status: 'draft', created: 2, duplicatesSkipped: 1 });
    const found = await s.drafts.findDraft(draftId);
    expect(found?.draft.status).toBe('draft');
    expect(found?.cards.map((c) => c.front)).toEqual(['be', 'to']);
    expect(found?.cards[0]?.back).toContain('trad de be');
  });

  it('marque « failed » quand aucun mot n’est neuf (rien à relire)', async () => {
    const s = setup([batch(['the', 'be'])]);
    seedExisting(s.drafts, ['the', 'be']);

    const { draftId, result } = await startThenRun(s);

    expect(result.status).toBe('failed');
    const found = await s.drafts.findDraft(draftId);
    expect(found?.draft.status).toBe('failed');
    expect(found?.draft.error).toContain('déjà couverte');
    expect(found?.cards).toHaveLength(0);
  });

  it('est additive : ignore les mots d’un brouillon déjà généré', async () => {
    const s = setup([batch(['the', 'be']), batch(['the', 'to'])]);

    const first = await startThenRun(s);
    expect(first.result.created).toBe(2);

    // 2e génération : "the" est déjà en brouillon → ignoré.
    const second = await startThenRun(s);
    expect(second.result.created).toBe(1);
    expect(second.result.duplicatesSkipped).toBe(1);
  });

  it('déduplique entre appels d’un même job (maxCalls > 1)', async () => {
    const s = setup([batch(['the', 'be', 'to']), batch(['to', 'of', 'and']), batch(['of', 'and'])], 3);

    const { result } = await startThenRun(s);

    expect(result.created).toBe(5); // the, be, to, of, and
    expect(result.duplicatesSkipped).toBe(3); // to (appel 2), of + and (appel 3)
    expect(result.batches).toBe(3);
  });

  it('ne laisse jamais un brouillon coincé en « generating » si le LLM échoue', async () => {
    // Réponses invalides → VocabGenerationError → completeDraft(failed).
    const s = setup(['pas du json', 'toujours pas'], 1);

    const { draftId, result } = await startThenRun(s);

    expect(result.status).toBe('failed');
    const found = await s.drafts.findDraft(draftId);
    expect(found?.draft.status).toBe('failed');
    expect(found?.draft.error).not.toBeNull();
  });

  it('compare de façon normalisée (casse/espaces ignorés)', async () => {
    const s = setup([batch(['The', ' be '])]);
    seedExisting(s.drafts, ['the']);

    const { result } = await startThenRun(s);

    expect(result.created).toBe(1); // seul "be"
    expect(result.duplicatesSkipped).toBe(1); // "The"
  });
});
