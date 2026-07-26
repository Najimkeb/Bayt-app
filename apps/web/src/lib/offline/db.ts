'use client';

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type { DueQueue, ReviewGrade } from '@/lib/api/types';

/**
 * Stockage local des données de révision (IndexedDB).
 *
 * Deux magasins :
 * - `snapshot` : la dernière file de cartes dues mise en cache **en ligne**,
 *   par domaine, pour pouvoir réviser hors-ligne ;
 * - `pending` : les révisions faites **hors-ligne**, en attente de synchro. Cette
 *   file est la donnée critique : elle **persiste** même app fermée, et n'est
 *   purgée qu'après confirmation serveur.
 */

/** Une révision faite hors-ligne, en attente d'envoi. */
export interface PendingReview {
  /** Id unique généré côté client — clé d'idempotence. */
  readonly clientId: string;
  readonly itemId: string;
  readonly grade: ReviewGrade;
  /** Instant RÉEL de la révision (ISO 8601). */
  readonly reviewedAt: string;
}

interface SnapshotRow {
  readonly domainKey: string;
  readonly queue: DueQueue;
  readonly savedAt: number;
}

interface BaytOfflineDB extends DBSchema {
  snapshot: { key: string; value: SnapshotRow };
  pending: { key: string; value: PendingReview };
}

const DB_NAME = 'bayt-offline';
const DB_VERSION = 1;

/** Domaine `undefined` → clé « all » (révision tous domaines confondus). */
export const domainKeyOf = (domainId?: string): string => domainId ?? 'all';

/** Événement diffusé quand la file d'attente change (badge de synchro). */
export const PENDING_CHANGED_EVENT = 'bayt:pending-changed';

function notifyPendingChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PENDING_CHANGED_EVENT));
  }
}

let dbPromise: Promise<IDBPDatabase<BaytOfflineDB>> | null = null;

/** IndexedDB peut manquer (jsdom, Safari en navigation privée) : on dégrade sans casser. */
function supported(): boolean {
  return typeof indexedDB !== 'undefined';
}

/** Ouvre la base, ou `null` si IndexedDB indisponible (on tombe alors en ligne seule). */
function db(): Promise<IDBPDatabase<BaytOfflineDB>> | null {
  if (!supported()) {
    return null;
  }
  dbPromise ??= openDB<BaytOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('snapshot')) {
        database.createObjectStore('snapshot', { keyPath: 'domainKey' });
      }
      if (!database.objectStoreNames.contains('pending')) {
        database.createObjectStore('pending', { keyPath: 'clientId' });
      }
    },
  });

  return dbPromise;
}

/** Met en cache la file dues d'un domaine (appelé après un fetch en ligne). */
export async function saveSnapshot(domainKey: string, queue: DueQueue): Promise<void> {
  const database = await db();
  await database?.put('snapshot', { domainKey, queue, savedAt: Date.now() });
}

/** Récupère la file mise en cache pour un domaine (ou `null`). */
export async function loadSnapshot(domainKey: string): Promise<DueQueue | null> {
  const database = await db();
  const row = await database?.get('snapshot', domainKey);

  return row?.queue ?? null;
}

/** Ajoute une révision hors-ligne à la file d'attente (persistante). */
export async function enqueuePending(review: PendingReview): Promise<void> {
  const database = await db();
  await database?.put('pending', review);
  notifyPendingChanged();
}

/** File d'attente complète, triée par ordre chronologique. */
export async function getPending(): Promise<PendingReview[]> {
  const database = await db();
  const all = (await database?.getAll('pending')) ?? [];

  return all.sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
}

/** Retire de la file les ids confirmés par le serveur. */
export async function removePending(clientIds: readonly string[]): Promise<void> {
  const database = await db();
  if (clientIds.length === 0 || database === null) {
    return;
  }
  const tx = database.transaction('pending', 'readwrite');
  await Promise.all(clientIds.map((id) => tx.store.delete(id)));
  await tx.done;
  notifyPendingChanged();
}

/** Nombre de révisions en attente de synchro. */
export async function countPending(): Promise<number> {
  const database = await db();

  return (await database?.count('pending')) ?? 0;
}

/** Ids d'items déjà révisés hors-ligne (pour les retirer de la file affichée). */
export async function pendingItemIds(): Promise<Set<string>> {
  const pending = await getPending();

  return new Set(pending.map((p) => p.itemId));
}
