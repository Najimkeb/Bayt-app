import type {
  DomainRow,
  PathRepository,
  PathUnitRow,
} from '../../application/ports/path-repository.js';

/** Une unité en mémoire, rattachée à un domaine. */
export interface InMemoryUnit extends PathUnitRow {
  readonly domainId: string;
}

/** Implémentation en mémoire du catalogue et du chemin de progression. */
export class InMemoryPathRepository implements PathRepository {
  readonly #domains: readonly DomainRow[];
  readonly #units: readonly InMemoryUnit[];
  readonly #completed = new Map<string, Set<string>>();

  public constructor(domainsList: readonly DomainRow[] = [], units: readonly InMemoryUnit[] = []) {
    this.#domains = [...domainsList].sort((a, b) => a.position - b.position);
    this.#units = units;
  }

  public findDomains(): Promise<readonly DomainRow[]> {
    return Promise.resolve(this.#domains);
  }

  public findUnits(domainId: string): Promise<readonly PathUnitRow[]> {
    return Promise.resolve(
      this.#units
        .filter((unit) => unit.domainId === domainId)
        .map((unit) => ({ id: unit.id, title: unit.title, lessons: unit.lessons })),
    );
  }

  public lessonIdsByDomain(): Promise<ReadonlyMap<string, readonly string[]>> {
    const map = new Map<string, string[]>();
    for (const unit of this.#units) {
      const list = map.get(unit.domainId) ?? [];
      list.push(...unit.lessons.map((lesson) => lesson.id));
      map.set(unit.domainId, list);
    }

    return Promise.resolve(map);
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
