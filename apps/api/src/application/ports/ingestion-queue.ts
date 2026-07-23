/** Message d'ingestion : quel document traiter. */
export interface IngestionMessage {
  readonly documentId: string;
}

/**
 * Port de mise en file du traitement asynchrone.
 *
 * Implémenté par Cloudflare Queues ; le consumer reprend le message hors du
 * chemin critique de la requête d'upload.
 */
export interface IngestionQueue {
  send(message: IngestionMessage): Promise<void>;
}
