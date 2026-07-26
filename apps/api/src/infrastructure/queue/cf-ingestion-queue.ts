import type { IngestionQueue, QueueJob } from '../../application/ports/ingestion-queue.js';

/** Sous-ensemble du binding Queue utilisé ici. */
export interface QueueLike {
  send(body: unknown): Promise<void>;
}

/** File de traitement asynchrone sur Cloudflare Queues. */
export class CfIngestionQueue implements IngestionQueue {
  public constructor(private readonly queue: QueueLike) {}

  public async send(job: QueueJob): Promise<void> {
    await this.queue.send(job);
  }
}

/** File en mémoire, pour les tests : conserve les jobs envoyés. */
export class InMemoryIngestionQueue implements IngestionQueue {
  public readonly sent: QueueJob[] = [];

  public send(job: QueueJob): Promise<void> {
    this.sent.push(job);

    return Promise.resolve();
  }
}
