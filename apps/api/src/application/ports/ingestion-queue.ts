/** Traitement asynchrone d'un document ingéré. */
export interface IngestDocumentJob {
  readonly kind: 'ingest';
  readonly documentId: string;
}

/**
 * Génération asynchrone d'un paquet de vocabulaire (studio).
 *
 * Le brouillon est déjà créé en statut `generating` ; le consumer lit ces
 * paramètres, génère les cartes et finalise le brouillon (`draft`/`failed`).
 */
export interface VocabGenerationJob {
  readonly kind: 'vocab';
  readonly draftId: string;
  /** Identifiant de tranche de fréquence (ex. `1-100`). */
  readonly tranche: string;
  readonly domainId: string;
  readonly batchSize?: number;
}

/** Tout job traité hors du chemin critique, sur la même file Cloudflare. */
export type QueueJob = IngestDocumentJob | VocabGenerationJob;

/**
 * Port de mise en file du traitement asynchrone.
 *
 * Implémenté par Cloudflare Queues ; le consumer reprend le job hors du chemin
 * critique de la requête (upload de document, lancement de génération…).
 */
export interface IngestionQueue {
  send(job: QueueJob): Promise<void>;
}
