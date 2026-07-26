import { describe, expect, it } from 'vitest';

import type { LLMCompletion, LLMProvider } from '../../src/ingestion/llm/provider.js';
import { VocabularyGenerator } from '../../src/ingestion/vocab/vocabulary-generator.js';
import { findTranche } from '../../src/ingestion/vocab/tranches.js';
import { GenerateVocabulary } from '../../src/application/use-cases/generate-vocabulary.js';
import { InMemoryLessonDraftRepository } from '../../src/infrastructure/repositories/in-memory-lesson-draft.repository.js';

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

/** Fabrique une réponse JSON de mots à partir d'une liste de mots anglais. */
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

function setup(responses: readonly string[], maxCalls = 1) {
  const drafts = new InMemoryLessonDraftRepository();
  const generator = new VocabularyGenerator(new ScriptedProvider(responses));
  const useCase = new GenerateVocabulary(
    generator,
    drafts,
    () => new Date('2026-07-26T12:00:00Z'),
    undefined,
    maxCalls,
  );

  return { drafts, useCase };
}

/** Pré-remplit le domaine avec des mots déjà « publiés » (base anti-doublon). */
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

describe('GenerateVocabulary', () => {
  it('ignore les mots déjà connus du domaine et compte le récap', async () => {
    // Le domaine connaît déjà "the". Le LLM en propose 3, dont "the".
    const { drafts, useCase } = setup([batch(['the', 'be', 'to']), '{"words":[]}']);
    seedExisting(drafts, ['the']);

    const result = await useCase.execute({ tranche: TRANCHE, domainId: DOMAIN, createdBy: 'admin' });

    expect(result.created).toBe(2); // be, to
    expect(result.duplicatesSkipped).toBe(1); // the
    expect(result.draftId).not.toBeNull();
  });

  it('déduplique entre appels d’une même génération (maxCalls > 1)', async () => {
    const { useCase } = setup(
      [
        batch(['the', 'be', 'to']),
        batch(['to', 'of', 'and']), // "to" déjà pris à l'appel 1
        batch(['of', 'and']), // que des doublons → arrêt anti-boucle
      ],
      3,
    );

    const result = await useCase.execute({ tranche: TRANCHE, domainId: DOMAIN, createdBy: 'admin' });

    expect(result.created).toBe(5); // the, be, to, of, and
    expect(result.duplicatesSkipped).toBe(3); // to (p2), of + and (p3)
    expect(result.batches).toBe(3);
  });

  it('s’arrête dès qu’un appel n’apporte plus aucun mot neuf (anti-boucle)', async () => {
    const { useCase } = setup([batch(['a', 'b']), batch(['a', 'b'])], 3);

    const result = await useCase.execute({ tranche: TRANCHE, domainId: DOMAIN, createdBy: 'admin' });

    expect(result.created).toBe(2);
    expect(result.batches).toBe(2); // 2e appel = que des doublons → break
  });

  it('ne crée pas de brouillon si tous les mots sont déjà connus', async () => {
    const { drafts, useCase } = setup([batch(['the', 'be'])]);
    seedExisting(drafts, ['the', 'be']);

    const result = await useCase.execute({ tranche: TRANCHE, domainId: DOMAIN, createdBy: 'admin' });

    expect(result.created).toBe(0);
    expect(result.draftId).toBeNull();
    expect(result.duplicatesSkipped).toBe(2);
  });

  it('crée un brouillon relisible : recto = mot, verso = sens + exemple', async () => {
    const { drafts, useCase } = setup([batch(['though']), '{"words":[]}']);

    const result = await useCase.execute({ tranche: TRANCHE, domainId: DOMAIN, createdBy: 'admin' });
    const found = await drafts.findDraft(result.draftId!);

    expect(found?.draft.status).toBe('draft');
    expect(found?.draft.domainId).toBe(DOMAIN);
    const card = found?.cards[0];
    expect(card?.front).toBe('though');
    expect(card?.back).toContain('trad de though');
    expect(card?.back).toContain('An example with though.');
    // Rien n'est publié tant que ce n'est pas validé + publié.
    expect(drafts.published).toHaveLength(0);
  });

  it('est additive : ignore les mots déjà présents dans un brouillon ouvert', async () => {
    // 1re génération crée un brouillon avec "the","be". 2e génération (relance)
    // doit ignorer ces mots-là même s'ils ne sont pas encore publiés.
    // 1 appel par génération (défaut) : un paquet par relance.
    const { drafts, useCase } = setup([
      batch(['the', 'be']),
      batch(['the', 'to']), // relance : "the" déjà en brouillon → ignoré
    ]);

    const first = await useCase.execute({ tranche: TRANCHE, domainId: DOMAIN, createdBy: 'admin' });
    expect(first.created).toBe(2);

    const second = await useCase.execute({ tranche: TRANCHE, domainId: DOMAIN, createdBy: 'admin' });
    expect(second.created).toBe(1); // seul "to" est neuf
    expect(second.duplicatesSkipped).toBe(1); // "the"
    // Deux brouillons distincts, sans mot en double entre eux.
    expect(drafts.published).toHaveLength(0);
    void drafts;
  });

  it('compare de façon normalisée (casse/espaces ignorés)', async () => {
    const { drafts, useCase } = setup([batch(['The', ' be ']), '{"words":[]}']);
    seedExisting(drafts, ['the']); // "the" connu → "The" doit être ignoré

    const result = await useCase.execute({ tranche: TRANCHE, domainId: DOMAIN, createdBy: 'admin' });

    expect(result.created).toBe(1); // seul "be"
    expect(result.duplicatesSkipped).toBe(1); // "The"
  });
});
