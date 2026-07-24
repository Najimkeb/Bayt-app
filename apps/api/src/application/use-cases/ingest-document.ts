import type { CardGenerator } from '../../ingestion/card-generator.js';
import { splitIntoSections } from '../../ingestion/chunking.js';
import { dedupeCards } from '../../ingestion/dedup.js';
import type { GeneratedCard } from '../../ingestion/card-schema.js';
import type { LearningItemRecord } from '../../ingestion/document.js';
import type { DocumentRepository } from '../ports/document-repository.js';
import type { DocumentStorage } from '../ports/document-storage.js';

/** Plafond de cartes par document, pour borner coût et bruit. */
const MAX_CARDS_PER_DOCUMENT = 40;

/**
 * Le consumer d'ingestion : lit le **texte déjà extrait** (via `DocumentStorage`,
 * D1 aujourd'hui) → découpage → agent → learning_items. L'extraction a eu lieu à
 * la réception : le message de file ne portait que l'`id`.
 *
 * Marque le document `processing`, puis `ready` (avec le nombre de cartes) ou
 * `failed` (avec le motif). Ne relève jamais : l'état final vit en base, la file
 * peut acquitter le message.
 */
export class IngestDocument {
  public constructor(
    private readonly documents: DocumentRepository,
    private readonly storage: DocumentStorage,
    private readonly generator: CardGenerator,
    private readonly clock: () => Date = () => new Date(),
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  public async execute(documentId: string): Promise<void> {
    const document = await this.documents.findById(documentId);
    if (document === null) {
      return;
    }

    try {
      await this.documents.updateStatus(documentId, {
        status: 'processing',
        updatedAt: this.clock().getTime(),
      });

      const text = await this.storage.get(documentId);
      if (text === null) {
        throw new Error('Texte extrait introuvable en base');
      }

      const sections = splitIntoSections(text);

      const generated: GeneratedCard[] = [];
      for (const section of sections) {
        if (generated.length >= MAX_CARDS_PER_DOCUMENT) {
          break;
        }
        generated.push(...(await this.generator.generate(section)));
      }

      const cards = dedupeCards(generated).slice(0, MAX_CARDS_PER_DOCUMENT);
      const sourceRef = `doc:${documentId}`;
      const createdAt = this.clock().getTime();

      const items: LearningItemRecord[] = cards.map((card) => ({
        id: this.newId(),
        type: 'flashcard',
        front: card.front,
        back: card.back,
        sourceRef,
        // Les cartes héritent du domaine choisi au dépôt du document.
        domainId: document.domainId,
        createdAt,
      }));

      await this.documents.replaceLearningItems(sourceRef, items);

      await this.documents.updateStatus(documentId, {
        status: 'ready',
        error: null,
        cardCount: items.length,
        updatedAt: this.clock().getTime(),
      });
    } catch (error) {
      await this.documents.updateStatus(documentId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        updatedAt: this.clock().getTime(),
      });
    }
  }
}
