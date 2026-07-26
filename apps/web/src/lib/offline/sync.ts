'use client';

import { replayReviews } from '@/lib/api/client';

import { getPending, removePending } from './db';

/**
 * Envoie la file des révisions hors-ligne au serveur, DANS L'ORDRE
 * CHRONOLOGIQUE, puis purge ce que le serveur confirme.
 *
 * **Sûr par construction** :
 * - le serveur est idempotent (id client) → renvoyer deux fois la même file ne
 *   double jamais les logs ;
 * - on ne purge QUE les ids confirmés (`settledClientIds`) → rien n'est perdu si
 *   l'envoi échoue ou est partiel : la file persiste et sera réessayée.
 *
 * Un verrou en mémoire évite deux synchros concurrentes.
 */
let syncing = false;

export interface SyncOutcome {
  readonly synced: number;
  readonly remaining: number;
  readonly ok: boolean;
}

export async function syncPending(): Promise<SyncOutcome> {
  if (syncing) {
    return { synced: 0, remaining: await pendingCount(), ok: true };
  }
  syncing = true;

  try {
    const pending = await getPending();
    if (pending.length === 0) {
      return { synced: 0, remaining: 0, ok: true };
    }

    const { settledClientIds } = await replayReviews(
      pending.map((p) => ({
        clientId: p.clientId,
        itemId: p.itemId,
        grade: p.grade,
        reviewedAt: p.reviewedAt,
      })),
    );

    await removePending(settledClientIds);
    const remaining = await pendingCount();

    return { synced: settledClientIds.length, remaining, ok: true };
  } catch {
    // Réseau/serveur indisponible : on garde la file intègre, on réessaiera.
    return { synced: 0, remaining: await pendingCount(), ok: false };
  } finally {
    syncing = false;
  }
}

async function pendingCount(): Promise<number> {
  return (await getPending()).length;
}
