import type { ObjectStorage } from '../../application/ports/object-storage.js';

/** Sous-ensemble du binding R2 utilisé ici. */
export interface R2Like {
  put(key: string, value: ArrayBuffer, options?: unknown): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
}

/** Stockage d'objets sur Cloudflare R2. */
export class R2ObjectStorage implements ObjectStorage {
  public constructor(private readonly bucket: R2Like) {}

  public async put(key: string, bytes: Uint8Array, contentType?: string | null): Promise<void> {
    await this.bucket.put(key, toArrayBuffer(bytes), {
      httpMetadata: contentType ? { contentType } : undefined,
    });
  }

  public async get(key: string): Promise<Uint8Array | null> {
    const object = await this.bucket.get(key);
    if (object === null) {
      return null;
    }

    return new Uint8Array(await object.arrayBuffer());
  }
}

/** Copie les octets dans un `ArrayBuffer` net (évite les vues partielles). */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);

  return buffer;
}
