/** Erreurs metier de la couche application, traduites en HTTP par les routes. */

/** Item inconnu — l'apprenant a demande une carte qui n'existe pas. */
export class ItemNotFoundError extends Error {
  public override readonly name = 'ItemNotFoundError';

  public constructor(public readonly itemId: string) {
    super(`Item introuvable : ${itemId}`);
  }
}
