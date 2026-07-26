import type {
  ExplanationLogRecord,
  ExplanationRepository,
} from '../../application/ports/explanation-repository.js';

/** Implémentation en mémoire de l'historique des explications (tests, sans D1). */
export class InMemoryExplanationRepository implements ExplanationRepository {
  public readonly logs: ExplanationLogRecord[] = [];

  public save(record: ExplanationLogRecord): Promise<void> {
    this.logs.push(record);

    return Promise.resolve();
  }

  public listForUser(userId: string, itemId?: string): Promise<readonly ExplanationLogRecord[]> {
    const filtered = this.logs
      .filter((log) => log.userId === userId && (itemId === undefined || log.itemId === itemId))
      .sort((a, b) => b.createdAt - a.createdAt);

    return Promise.resolve(filtered);
  }
}
