'use client';

import { Button } from '@bayt/ui';
import { Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState, type FormEvent, type ReactElement } from 'react';

import { useDomains } from '@/lib/api/domain-queries';
import { useGenerateVocabulary } from '@/lib/api/studio-queries';
import type { VocabTranche } from '@/lib/api/client';
import { useUserId } from '@/lib/auth/use-user-id';

/** Tranches de fréquence (miroir du serveur) — bornes de rang + libellé. */
const TRANCHES: readonly { id: VocabTranche; label: string; start: number; end: number }[] = [
  { id: '1-100', label: 'Les 100 mots les plus fréquents', start: 1, end: 100 },
  { id: '100-300', label: 'Mots 100 à 300', start: 100, end: 300 },
  { id: '300-600', label: 'Mots 300 à 600', start: 300, end: 600 },
  { id: '600-1000', label: 'Mots 600 à 1000', start: 600, end: 1000 },
];

/** Mots neufs par génération (paquet relisable, miroir du défaut serveur). */
const BATCH_SIZE = 30;

/** Domaine anglais par défaut du catalogue. */
const DEFAULT_DOMAIN = 'dom_anglais';

/**
 * Générateur de vocabulaire par tranche de fréquence.
 *
 * L'admin choisit une tranche (mots par ordre d'utilité), voit une **estimation**,
 * lance la génération (**asynchrone** via la file) et est amené droit au brouillon,
 * qui se remplit puis passe en relecture. Rien n'entre en mémoire sans validation.
 */
export function VocabPanel(): ReactElement {
  const ids = useId();
  const router = useRouter();
  const userId = useUserId();
  const domains = useDomains(userId);
  const generate = useGenerateVocabulary();

  const [trancheId, setTrancheId] = useState<VocabTranche>('1-100');
  const [domainId, setDomainId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const domainList = domains.data?.domains ?? [];
  const effectiveDomain =
    domainId || (domainList.some((d) => d.id === DEFAULT_DOMAIN) ? DEFAULT_DOMAIN : domainList[0]?.id ?? '');

  const tranche = TRANCHES.find((t) => t.id === trancheId) ?? TRANCHES[0]!;

  // Estimation : chaque génération produit UN paquet relisable ; on relance pour
  // couvrir la tranche (dédup additive → jamais de doublon). Mots totaux visés
  // par la tranche, à titre indicatif.
  const trancheWords = useMemo(() => tranche.end - tranche.start + 1, [tranche]);

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    generate.mutate(
      { tranche: trancheId, domainId: effectiveDomain },
      {
        // La génération tourne en tâche de fond : on ouvre le brouillon, qui
        // affiche « génération en cours » puis se remplit tout seul.
        onSuccess: ({ draftId }) => router.push(`/admin/lessons/${draftId}`),
        onError: (err) =>
          setError(
            err.message === '501'
              ? 'File de traitement non configurée côté serveur.'
              : 'Le lancement a échoué. Réessaie.',
          ),
      },
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border-2 border-border bg-surface p-5"
    >
      <div className="flex items-center gap-2">
        <Languages aria-hidden="true" className="size-5 text-macaw" />
        <h3 className="text-base font-extrabold">Vocabulaire anglais par fréquence</h3>
      </div>
      <p className="text-xs font-bold text-muted-foreground">
        Les mots les plus utiles d&apos;abord. L&apos;IA s&apos;appuie sur les listes de fréquence
        standard ; tu relis et valides avant publication.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${ids}-tranche`} className="text-sm font-extrabold">
            Tranche de fréquence
          </label>
          <select
            id={`${ids}-tranche`}
            value={trancheId}
            onChange={(e) => setTrancheId(e.target.value as VocabTranche)}
            className="h-12 rounded-[var(--radius-card)] border-2 border-border bg-surface px-3 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TRANCHES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${ids}-domain`} className="text-sm font-extrabold">
            Domaine cible
          </label>
          <select
            id={`${ids}-domain`}
            value={effectiveDomain}
            onChange={(e) => setDomainId(e.target.value)}
            className="h-12 rounded-[var(--radius-card)] border-2 border-border bg-surface px-3 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {domainList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estimation avant génération (économie de quota). */}
      <p className="rounded-[var(--radius-button)] bg-surface-hover/60 px-3 py-2 text-xs font-bold text-muted-foreground">
        ~{BATCH_SIZE} mots par génération (en tâche de fond). Cette tranche compte ≈{trancheWords}{' '}
        mots au total, relance pour la couvrir, sans doublon (les mots déjà connus sont ignorés).
      </p>

      {error !== null && (
        <p role="alert" className="text-sm font-bold text-cardinal">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="brand"
        size="md"
        disabled={generate.isPending || effectiveDomain === ''}
        className="self-start"
      >
        <Languages aria-hidden="true" className="size-4" />
        {generate.isPending ? 'Lancement…' : 'Générer le vocabulaire'}
      </Button>
    </form>
  );
}
