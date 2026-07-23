import type {
  PathRepository,
  PathUnitRow,
} from '../../application/ports/path-repository.js';

/** Implémentation en mémoire du chemin de progression. */
export class InMemoryPathRepository implements PathRepository {
  readonly #units: readonly PathUnitRow[];
  readonly #completed = new Map<string, Set<string>>();

  public constructor(units: readonly PathUnitRow[] = []) {
    this.#units = units;
  }

  public findUnits(): Promise<readonly PathUnitRow[]> {
    return Promise.resolve(this.#units);
  }

  public findCompletedLessonIds(userId: string): Promise<readonly string[]> {
    return Promise.resolve([...(this.#completed.get(userId) ?? [])]);
  }

  public markLessonCompleted(userId: string, lessonId: string): Promise<void> {
    const set = this.#completed.get(userId) ?? new Set<string>();
    set.add(lessonId);
    this.#completed.set(userId, set);

    return Promise.resolve();
  }
}
