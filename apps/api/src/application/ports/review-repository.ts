import type { ReviewLog, SchedulingState } from '@bayt/domain';

/** Type d'item revisable — reflete la colonne `learning_items.type`. */
export type LearningItemType = 'flashcard' | 'cloze' | 'practice_case';

/** Projection d'un item telle que la couche application la manipule. */
export interface LearningItemView {
  readonly id: string;
  readonly type: LearningItemType;
  readonly front: string;
  readonly back: string;
}

/**
 * Une carte du point de vue d'un apprenant : l'item et son etat de planification.
 *
 * `state` vaut `null` quand l'item n'a jamais ete planifie pour cet apprenant :
 * il est alors du immediatement, et son etat est materialise a la premiere
 * revision.
 */
export interface ReviewCard {
  readonly item: LearningItemView;
  readonly state: SchedulingState | null;
}

/** Ce qu'une revision doit persister, de maniere atomique. */
export interface ReviewCommit {
  readonly userId: string;
  readonly itemId: string;
  /** Nouvel etat de planification (remplace le precedent). */
  readonly state: SchedulingState;
  /** Trace de la revision (ajoutee, jamais modifiee). */
  readonly log: ReviewLog;
}

/**
 * Port de persistance de la boucle de revision.
 *
 * Volontairement etroit : la couche application ne connait que ce contrat, ce
 * qui permet de la tester avec `InMemoryReviewRepository` sans D1 ni Worker.
 */
export interface ReviewRepository {
  /**
   * Cartes a reviser pour un apprenant, triees par echeance croissante
   * (les cartes jamais planifiees passent en premier).
   *
   * `domainId` filtre les cartes d'un domaine ; absent = tous domaines confondus.
   */
  findDue(
    userId: string,
    now: Date,
    limit: number,
    domainId?: string,
  ): Promise<readonly ReviewCard[]>;

  /** Nombre de cartes dues par domaine (cartes sans domaine exclues). */
  dueCountsByDomain(userId: string, now: Date): Promise<ReadonlyMap<string, number>>;

  /** Une carte precise, ou `null` si l'item n'existe pas. */
  findCard(userId: string, itemId: string): Promise<ReviewCard | null>;

  /**
   * Enregistre une revision : nouvel etat **et** ajout du log, atomiquement.
   * Les deux ne doivent jamais diverger.
   */
  commitReview(commit: ReviewCommit): Promise<void>;
}
