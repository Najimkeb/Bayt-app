/** Un domaine tel que la persistance le renvoie. */
export interface DomainRow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Nom de l'icône lucide-react (mappé vers un composant côté UI). */
  readonly icon: string;
  /** Jeton de couleur d'accent (`DomainColor`), stocké en texte. */
  readonly color: string;
  readonly position: number;
}

/** Une leçon telle que le chemin la référence (id + titre). */
export interface PathLessonRow {
  readonly id: string;
  readonly title: string;
}

/** Une unité et ses leçons, dans l'ordre du chemin (au sein d'un domaine). */
export interface PathUnitRow {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly PathLessonRow[];
}

/**
 * Port de persistance du **catalogue** (domaines → unités → leçons) et de la
 * complétion des leçons.
 */
export interface PathRepository {
  /** Domaines du catalogue, ordonnés par rang d'affichage. */
  findDomains(): Promise<readonly DomainRow[]>;

  /** Unités d'un domaine, ordonnées, chacune avec ses leçons ordonnées. */
  findUnits(domainId: string): Promise<readonly PathUnitRow[]>;

  /** Identifiants de leçons par domaine (pour la progression par domaine). */
  lessonIdsByDomain(): Promise<ReadonlyMap<string, readonly string[]>>;

  /** Identifiants des leçons terminées par l'apprenant. */
  findCompletedLessonIds(userId: string): Promise<readonly string[]>;

  /** Marque une leçon terminée (idempotent : conserve la première réussite). */
  markLessonCompleted(userId: string, lessonId: string, completedAt: Date): Promise<void>;
}
