import type {
  IngestionMessage,
  IngestionQueue,
} from '../../application/ports/ingestion-queue.js';

/** Sous-ensemble du binding Queue utilisé ici. */
export interface QueueLike {
  send(body: unknown): Promise<void>;
}

/** File d'ingestion sur Cloudflare Queues. */
export class CfIngestionQueue implements IngestionQueue {
  public constructor(private readonly queue: QueueLike) {}

  public async send(message: IngestionMessage): Promise<void> {
    await this.queue.send(message);
  }
}

/** File en mémoire, pour les tests : conserve les messages envoyés. */
export class InMemoryIngestionQueue implements IngestionQueue {
  public readonly sent: IngestionMessage[] = [];

  public send(message: IngestionMessage): Promise<void> {
    this.sent.push(message);

    return Promise.resolve();
  }
}
