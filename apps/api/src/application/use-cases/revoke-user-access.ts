import type { AccessRepository } from '../ports/access-repository.js';
import type { AdminUserRepository } from '../ports/admin-user-repository.js';
import type { IdentityRepository } from '../ports/identity-repository.js';

/**
 * Cas d'usage « l'admin révoque l'accès d'un compte ».
 *
 * Ne supprime pas le compte : retire l'e-mail de la liste blanche (bloque les
 * connexions futures, via le hook) **et** ferme les sessions ouvertes
 * (déconnexion immédiate). Renvoie `false` si le compte est introuvable.
 */
export class RevokeUserAccess {
  public constructor(
    private readonly access: AccessRepository,
    private readonly identity: IdentityRepository,
    private readonly adminUsers: AdminUserRepository,
  ) {}

  public async execute(userId: string): Promise<boolean> {
    const identity = await this.identity.findById(userId);
    if (identity === null) {
      return false;
    }

    await this.access.remove(identity.email);
    await this.adminUsers.deleteSessions(userId);

    return true;
  }
}
