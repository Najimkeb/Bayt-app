'use client';

import { KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { useState, type ReactElement } from 'react';

import { useCreateResetToken, useRevokeUser } from '@/lib/api/admin-queries';
import type { AdminUser } from '@/lib/api/admin-types';

/** Formate une date epoch ms (ou « jamais »/« — »). */
function formatDate(ms: number | null): string {
  if (ms === null) return 'jamais';
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(ms),
    );
  } catch {
    return '—';
  }
}

/** Gestion des comptes : réinitialisation par lien, révocation d'accès. */
export function UsersPanel({ users }: { users: readonly AdminUser[] }): ReactElement {
  return (
    <ul className="flex flex-col gap-3">
      {users.length === 0 && (
        <li className="rounded-[var(--radius-card)] border-2 border-border bg-surface p-4 text-sm font-bold text-muted-foreground">
          Aucun compte inscrit pour l&apos;instant.
        </li>
      )}
      {users.map((user) => (
        <UserRow key={user.id} user={user} />
      ))}
    </ul>
  );
}

function UserRow({ user }: { user: AdminUser }): ReactElement {
  const createToken = useCreateResetToken();
  const revoke = useRevokeUser();

  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  function onReset(): void {
    setCopied(false);
    createToken.mutate(user.id, { onSuccess: (data) => setLink(data.link) });
  }

  async function onCopy(): Promise<void> {
    if (link === null) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2 truncate text-sm font-extrabold">
            {user.name}
            {user.role === 'admin' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-macaw/15 px-2 py-0.5 text-[0.7rem] font-black text-macaw">
                <ShieldCheck aria-hidden="true" className="size-3" />
                admin
              </span>
            )}
          </span>
          <span className="truncate text-xs font-bold text-muted-foreground">{user.email}</span>
          <span className="text-[0.7rem] font-bold text-muted-foreground">
            Inscrit le {formatDate(user.createdAt)} · vu {formatDate(user.lastActiveAt)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={createToken.isPending}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-border px-3 py-1.5 text-xs font-extrabold transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <KeyRound aria-hidden="true" className="size-3.5" />
            {createToken.isPending ? 'Génération…' : 'Réinitialiser'}
          </button>

          {confirmRevoke ? (
            <button
              type="button"
              onClick={() => revoke.mutate(user.id)}
              disabled={revoke.isPending}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-cardinal bg-cardinal/10 px-3 py-1.5 text-xs font-extrabold text-cardinal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <ShieldOff aria-hidden="true" className="size-3.5" />
              {revoke.isPending ? 'Révocation…' : 'Confirmer ?'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRevoke(true)}
              aria-label={`Révoquer l'accès de ${user.email}`}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-border px-3 py-1.5 text-xs font-extrabold text-muted-foreground transition-colors hover:border-cardinal/40 hover:text-cardinal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShieldOff aria-hidden="true" className="size-3.5" />
              Révoquer
            </button>
          )}
        </div>
      </div>

      {/* Lien de réinitialisation généré : à transmettre manuellement. */}
      {link !== null && (
        <div className="flex flex-col gap-2 rounded-[var(--radius-button)] border-2 border-macaw/30 bg-macaw/5 p-3">
          <p className="text-xs font-bold text-muted-foreground">
            Lien à transmettre (valable 1 h, usage unique) :
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1.5 text-xs font-bold">
              {link}
            </code>
            <button
              type="button"
              onClick={() => void onCopy()}
              className="shrink-0 rounded-full border-2 border-border px-3 py-1.5 text-xs font-extrabold transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
        </div>
      )}

      {revoke.isError && (
        <p role="alert" className="text-xs font-bold text-cardinal">
          La révocation a échoué. Réessaie.
        </p>
      )}
    </li>
  );
}
