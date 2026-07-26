import { describe, expect, it } from 'vitest';

import { GenerateSourcedLesson, NoSourcesError } from '../../src/application/use-cases/generate-sourced-lesson.js';
import { PublishLessonDraft } from '../../src/application/use-cases/publish-lesson-draft.js';
import { CardAuditor } from '../../src/ingestion/sourced/card-auditor.js';
import { FakeWebSearchProvider } from '../../src/ingestion/sourced/fake-search.provider.js';
import type { LLMProvider } from '../../src/ingestion/llm/provider.js';
import type { SearchDocument } from '../../src/ingestion/sourced/search-provider.js';
import {
  SourcedCardGenerator,
  SourcedGenerationError,
} from '../../src/ingestion/sourced/sourced-card-generator.js';
import { parseSourcedCards } from '../../src/ingestion/sourced/sourced-card-schema.js';
import { InMemoryLessonDraftRepository } from '../../src/infrastructure/repositories/in-memory-lesson-draft.repository.js';

const NOW = new Date('2026-03-15T12:00:00Z');
const DOCS: SearchDocument[] = [
  {
    url: 'https://www.cnil.fr/rgpd',
    title: 'CNIL — RGPD',
    content: 'Le RGPD encadre le traitement des données personnelles depuis 2018.',
  },
];

const provider = (output: string): LLMProvider => ({ complete: () => Promise.resolve(output) });

const cardJson = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({
    cards: [
      {
        front: 'Depuis quand le RGPD s’applique-t-il ?',
        back: '2018.',
        sourceUrl: 'https://www.cnil.fr/rgpd',
        sourceExtract: 'Le RGPD encadre le traitement des données personnelles depuis 2018.',
        ...over,
      },
    ],
  });

function counter(): () => string {
  let n = 0;

  return () => `id-${String(n++)}`;
}

describe('parseSourcedCards (grounding)', () => {
  const allowed = new Set(['https://www.cnil.fr/rgpd']);

  it('rejette une carte sans URL ni extrait (champs obligatoires)', () => {
    expect(() => parseSourcedCards(JSON.stringify({ cards: [{ front: 'Q?', back: 'R' }] }), allowed)).toThrow();
  });

  it('filtre une carte dont l’URL ne vient pas des sources récupérées', () => {
    const foreign = cardJson({ sourceUrl: 'https://exemple-inconnu.test/x' });
    expect(parseSourcedCards(foreign, allowed)).toHaveLength(0);
  });

  it('garde une carte correctement sourcée', () => {
    expect(parseSourcedCards(cardJson(), allowed)).toHaveLength(1);
  });
});

describe('SourcedCardGenerator', () => {
  it('génère uniquement des cartes adossées à une source fournie', async () => {
    const cards = await new SourcedCardGenerator(provider(cardJson())).generate(DOCS, 'beginner');
    expect(cards).toHaveLength(1);
    expect(cards[0]?.sourceUrl).toBe('https://www.cnil.fr/rgpd');
  });

  it('échoue si aucune carte n’est adossée à une source', async () => {
    const foreign = provider(cardJson({ sourceUrl: 'https://ailleurs.test/y' }));
    await expect(new SourcedCardGenerator(foreign, 12, 1).generate(DOCS, 'beginner')).rejects.toBeInstanceOf(
      SourcedGenerationError,
    );
  });
});

describe('GenerateSourcedLesson', () => {
  const auditor = () =>
    new CardAuditor(provider(JSON.stringify({ audits: [{ index: 0, verdict: 'ok', reason: 'soutenue' }] })));

  it('persiste un brouillon (jamais publié) avec sources et audit', async () => {
    const drafts = new InMemoryLessonDraftRepository();
    const draftId = await new GenerateSourcedLesson(
      new FakeWebSearchProvider(DOCS),
      new SourcedCardGenerator(provider(cardJson())),
      auditor(),
      drafts,
      () => NOW,
      counter(),
    ).execute({ topic: 'RGPD', domainId: 'dom_rgpd', level: 'beginner', createdBy: 'admin1' });

    const found = await drafts.findDraft(draftId);
    expect(found?.draft.status).toBe('draft');
    expect(found?.cards).toHaveLength(1);
    expect(found?.cards[0]?.auditVerdict).toBe('ok');
    expect(found?.cards[0]?.sourceUrl).toBe('https://www.cnil.fr/rgpd');
    // Rien n'est encore entré en mémoire (invisible en révision).
    expect(drafts.published).toHaveLength(0);
  });

  it('refuse de générer sans source (n’invente pas de leçon)', async () => {
    await expect(
      new GenerateSourcedLesson(
        new FakeWebSearchProvider([]),
        new SourcedCardGenerator(provider(cardJson())),
        auditor(),
        new InMemoryLessonDraftRepository(),
      ).execute({ topic: 'X', domainId: 'dom_rgpd', level: 'beginner', createdBy: 'a' }),
    ).rejects.toBeInstanceOf(NoSourcesError);
  });
});

describe('PublishLessonDraft', () => {
  it('ne publie QUE les cartes validées vers les learning_items', async () => {
    const drafts = new InMemoryLessonDraftRepository();
    const id = counter();
    const draftId = await new GenerateSourcedLesson(
      new FakeWebSearchProvider([
        DOCS[0]!,
        { url: 'https://www.cnil.fr/consentement', title: 'CNIL', content: 'Le consentement doit être libre.' },
      ]),
      new SourcedCardGenerator(
        provider(
          JSON.stringify({
            cards: [
              { front: 'Q1?', back: 'R1', sourceUrl: 'https://www.cnil.fr/rgpd', sourceExtract: 'Le RGPD encadre le traitement des données personnelles depuis 2018.' },
              { front: 'Q2?', back: 'R2', sourceUrl: 'https://www.cnil.fr/consentement', sourceExtract: 'Le consentement doit être libre.' },
            ],
          }),
        ),
      ),
      new CardAuditor(provider('{}')),
      drafts,
      () => NOW,
      id,
    ).execute({ topic: 'RGPD', domainId: 'dom_rgpd', level: 'beginner', createdBy: 'admin1' });

    const before = await drafts.findDraft(draftId);
    // Valide une seule des deux cartes.
    await drafts.setCardStatus(before!.cards[0]!.id, 'validated');

    const result = await new PublishLessonDraft(drafts, () => NOW, id).execute(draftId);

    expect(result?.published).toBe(1);
    expect(drafts.published).toHaveLength(1);
    expect(drafts.published[0]?.domainId).toBe('dom_rgpd');
    expect(drafts.published[0]?.sourceRef).toBe(`draft:${draftId}`);

    const after = await drafts.findDraft(draftId);
    expect(after?.draft.status).toBe('published');
  });
});
