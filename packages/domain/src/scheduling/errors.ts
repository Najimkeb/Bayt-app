/** Erreur levee quand la configuration d'un `Scheduler` viole une invariante. */
export class SchedulerConfigError extends Error {
  public override readonly name = 'SchedulerConfigError';

  public constructor(message: string) {
    super(message);
  }
}
