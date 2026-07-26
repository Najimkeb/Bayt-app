'use client';

import { useEffect, useState, type ReactElement } from 'react';

import {
  deletePushSubscription,
  fetchPushPublicKey,
  savePushSubscription,
} from '@/lib/api/client';
import { useReminderSettings, useSaveReminderSettings } from '@/lib/api/reminder-queries';
import { useUserId } from '@/lib/auth/use-user-id';
import {
  getExistingSubscription,
  getPushCapability,
  subscribeToPush,
  unsubscribeFromPush,
  type PushCapability,
} from '@/lib/push/web-push-client';

/** Heures proposées pour le rappel quotidien (créneaux usuels + libellé lisible). */
const HOURS: readonly number[] = [6, 7, 8, 9, 12, 13, 18, 19, 20, 21];

/**
 * Réglages de rappel — niveau 1 (dans l'app, fiable) + niveau 2 (push, best-effort).
 *
 * Niveau 1 : activer/désactiver + heure quotidienne préférée (le fuseau suit le
 * navigateur). Niveau 2 : bouton d'abonnement push, proposé **seulement** si
 * l'appareil le permet — sinon message d'installation (iOS) ou rien.
 */
export function ReminderSettings(): ReactElement {
  const userId = useUserId();
  const settings = useReminderSettings(userId);
  const save = useSaveReminderSettings(userId);

  const enabled = settings.data?.enabled ?? false;
  const hour = settings.data?.hour ?? 9;

  function toggle(): void {
    save.mutate({ enabled: !enabled, hour });
  }

  function chooseHour(nextHour: number): void {
    save.mutate({ enabled, hour: nextHour });
  }

  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-card)] border-2 border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-sm font-extrabold">Rappels de révision</p>
          <p className="text-xs font-bold text-muted-foreground">
            Un rappel bienveillant quand des cartes t&apos;attendent. Jamais de pression.
          </p>
        </div>
        <ReminderToggle enabled={enabled} pending={save.isPending} onToggle={toggle} />
      </div>

      {enabled && (
        <fieldset className="flex flex-col gap-2" disabled={save.isPending}>
          <legend className="text-xs font-extrabold text-muted-foreground">
            Heure du rappel (ton fuseau)
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Heure du rappel">
            {HOURS.map((h) => {
              const active = h === hour;

              return (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => chooseHour(h)}
                  className={[
                    'min-w-14 rounded-full border-2 px-3 py-1.5 text-sm font-extrabold tabular-nums',
                    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    'disabled:opacity-60',
                    active
                      ? 'border-fox-orange bg-fox-orange/10 text-fox-orange'
                      : 'border-border text-muted-foreground hover:bg-surface-hover',
                  ].join(' ')}
                >
                  {String(h)}h
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <p aria-live="polite" className="text-xs font-bold text-muted-foreground">
        {save.isPending
          ? 'Enregistrement…'
          : save.isError
            ? 'Impossible d’enregistrer. Réessaie.'
            : enabled
              ? `Tu seras rappelé vers ${String(hour)}h si des cartes sont dues.`
              : 'Rappels désactivés.'}
      </p>

      {enabled && <PushSection />}
    </div>
  );
}

/** Interrupteur accessible (role="switch"), style Duolingo. */
function ReminderToggle({
  enabled,
  pending,
  onToggle,
}: {
  enabled: boolean;
  pending: boolean;
  onToggle: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Activer les rappels de révision"
      disabled={pending}
      onClick={onToggle}
      className={[
        'relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-60',
        enabled ? 'border-feather-green bg-feather-green' : 'border-border bg-surface-hover',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'absolute top-1/2 size-6 -translate-y-1/2 rounded-full bg-white shadow transition-all',
          enabled ? 'left-[calc(100%-1.6rem)]' : 'left-0.5',
        ].join(' ')}
      />
    </button>
  );
}

/**
 * Section « notifications push » (niveau 2). S'affiche selon la capacité de
 * l'appareil : bouton d'abonnement si possible, message d'installation sur iOS,
 * rien si non pris en charge (le niveau 1 suffit).
 */
function PushSection(): ReactElement | null {
  const [capability, setCapability] = useState<PushCapability | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Capacité + état d'abonnement calculés côté client (évite un écart SSR).
  useEffect(() => {
    const cap = getPushCapability();
    setCapability(cap);
    if (cap === 'ready') {
      void getExistingSubscription().then((sub) => {
        setSubscribed(sub !== null);
      });
    }
  }, []);

  async function enablePush(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const { publicKey } = await fetchPushPublicKey();
      if (publicKey === null) {
        setError('Les notifications push ne sont pas configurées sur le serveur.');

        return;
      }
      const subscription = await subscribeToPush(publicKey);
      if (subscription === null) {
        setError('Permission refusée. Tu peux réactiver depuis les réglages du navigateur.');

        return;
      }
      await savePushSubscription(subscription);
      setSubscribed(true);
    } catch {
      setError('Impossible d’activer les notifications. Réessaie.');
    } finally {
      setBusy(false);
    }
  }

  async function disablePush(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint !== null) {
        await deletePushSubscription(endpoint);
      }
      setSubscribed(false);
    } catch {
      setError('Impossible de désactiver. Réessaie.');
    } finally {
      setBusy(false);
    }
  }

  if (capability === null || capability === 'unsupported') {
    // Non pris en charge : on reste silencieux, le niveau 1 (dans l'app) suffit.
    return null;
  }

  if (capability === 'needs-install-ios') {
    return (
      <div className="rounded-[var(--radius-card)] border-2 border-dashed border-border bg-surface-hover/50 p-3">
        <p className="text-xs font-bold text-muted-foreground">
          📲 Ajoute BAYT à ton écran d&apos;accueil pour recevoir des rappels même l&apos;app
          fermée. Partage → « Sur l&apos;écran d&apos;accueil ».
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t-2 border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-sm font-extrabold">Notifications push</p>
          <p className="text-xs font-bold text-muted-foreground">
            Reçois le rappel même quand l&apos;app est fermée.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void (subscribed ? disablePush() : enablePush())}
          className={[
            'shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-extrabold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            'disabled:opacity-60',
            subscribed
              ? 'border-border text-muted-foreground hover:bg-surface-hover'
              : 'border-macaw bg-macaw/10 text-macaw',
          ].join(' ')}
        >
          {busy ? '…' : subscribed ? 'Désactiver' : 'Activer'}
        </button>
      </div>
      {error !== null && (
        <p role="alert" className="text-xs font-bold text-cardinal">
          {error}
        </p>
      )}
    </div>
  );
}
