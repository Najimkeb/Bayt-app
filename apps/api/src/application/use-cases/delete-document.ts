import type { DocumentRepository } from '../ports/document-repository.js';
import type { ObjectStorage } from '../ports/object-storage.js';

/**
 * Cas d'usage « je supprime un document ».
 *
 * Retire le fichier source (R2), puis le document et toutes ses cartes (et leur
 * état de révision) en base. Sert notamment à nettoyer les documents en échec
 * sans avoir à les réingérer.
 */
export class DeleteDocument {
  public constructor(
    private readonly documents: DocumentRepository,
    private readonly storage: ObjectStorage,
  ) {}

  /** Renvoie `false` si le document est introuvable (rien à supprimer). */
  public async execute(id: string): Promise<boolean> {
    const document = await this.documents.findById(id);
    if (document === null) {
      return false;
    }

    // Le fichier brut d'abord (best-effort côté port : delete ne lève pas si
    // absent), puis les lignes en base de manière atomique.
    await this.storage.delete(document.r2Key);
    await this.documents.delete(id, `doc:${id}`);

    return true;
  }
}
