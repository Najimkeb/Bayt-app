import type {
  DocumentRecord,
  DocumentStatus,
  LearningItemRecord,
} from '../../ingestion/document.js';

/** Champs mis à jour au fil du traitement d'un document. */
export interface DocumentStatusPatch {
  readonly status: DocumentStatus;
  readonly error?: string | null;
  readonly cardCount?: number;
  readonly updatedAt: number;
}

/** Port de persistance des documents et des cartes qu'ils produisent. */
export interface DocumentRepository {
  create(document: DocumentRecord): Promise<void>;
  findById(id: string): Promise<DocumentRecord | null>;
  list(userId: string): Promise<readonly DocumentRecord[]>;
  updateStatus(id: string, patch: DocumentStatusPatch): Promise<void>;

  /** Remplace les cartes d'une source (réingestion idempotente). */
  replaceLearningItems(sourceRef: string, items: readonly LearningItemRecord[]): Promise<void>;

  /** Cartes générées pour une source, dans l'ordre de génération. Lecture seule. */
  listLearningItems(sourceRef: string): Promise<readonly LearningItemRecord[]>;

  /**
   * Supprime un document et **toutes** ses cartes (et leur état de révision).
   *
   * `sourceRef` désigne les cartes du document (`doc:<id>`). Opération atomique
   * côté persistance. Ne touche pas au texte extrait : c'est le cas d'usage qui
   * l'orchestre via `DocumentStorage`.
   */
  delete(id: string, sourceRef: string): Promise<void>;
}
