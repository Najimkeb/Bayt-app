'use client';

import { useEffect, useRef, useState, type ReactElement, type Ref } from 'react';

import type { BeatPreset } from '@/lib/audio/binaural-engine';
import { useFocusSound } from '@/lib/audio/use-focus-sound';

/** Préréglages exposés à l'apprenant. Libellés neutres, sans allégation. */
const PRESETS: readonly { value: BeatPreset; label: string; hz: string; hint: string }[] = [
  { value: 'alpha', label: 'Alpha', hz: '10 Hz', hint: 'concentration détendue' },
  { value: 'theta', label: 'Thêta', hz: '6 Hz', hint: 'calme' },
  { value: 'beta', label: 'Bêta', hz: '16 Hz', hint: 'vigilance' },
];

/**
 * Contrôle d'ambiance sonore dans l'en-tête : un bouton discret ouvre un
 * panneau de réglages (marche/arrêt, fréquence, volume, bruit rose).
 *
 * Discours honnête : casque requis, aucun effet promis, coupure immédiate.
 */
export function FocusSound(): ReactElement {
  const { state, supported, toggle, setPreset, setVolume, setPinkNoise } = useFocusSound();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const switchRef = useRef<HTMLButtonElement>(null);
  const titleId = 'focus-sound-title';

  // Fermeture par Échap + clic extérieur ; focus sur l'interrupteur à l'ouverture.
  useEffect(() => {
    if (!open) {
      return;
    }
    switchRef.current?.focus();

    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    function onPointer(event: MouseEvent): void {
      if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          state.enabled ? 'Ambiance sonore (active), réglages' : 'Ambiance sonore, réglages'
        }
        title="Ambiance sonore"
        className="relative inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <HeadphonesIcon />
        {state.enabled && (
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 size-2 rounded-full bg-feather-green"
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-[var(--radius-card)] border-2 border-border bg-surface p-4 shadow-lg"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-base font-extrabold">
              Ambiance sonore
            </h2>
            <Switch
              ref={switchRef}
              checked={state.enabled}
              onChange={toggle}
              label={state.enabled ? "Couper l'ambiance sonore" : "Activer l'ambiance sonore"}
            />
          </div>

          {/* Avertissement casque — la condition pour que l'effet existe. */}
          <p className="mt-3 flex gap-2 rounded-xl bg-macaw/10 p-2.5 text-xs font-bold text-macaw">
            <span aria-hidden="true">🎧</span>
            <span>
              Nécessite un <strong>casque ou des écouteurs</strong> : l&apos;effet repose sur une
              fréquence différente dans chaque oreille. Sans casque, ça ne fonctionne pas.
            </span>
          </p>

          {!supported && (
            <p role="alert" className="mt-2 text-xs font-bold text-cardinal">
              Ton navigateur ne prend pas en charge la génération audio.
            </p>
          )}

          <fieldset className="mt-4" disabled={!state.enabled}>
            <legend className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              Fréquence
            </legend>
            <div
              role="radiogroup"
              aria-label="Fréquence de battement"
              className="mt-2 grid grid-cols-3 gap-1.5"
            >
              {PRESETS.map((preset) => {
                const selected = state.preset === preset.value;

                return (
                  <button
                    key={preset.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPreset(preset.value)}
                    className={[
                      'flex flex-col items-center gap-0.5 rounded-xl border-2 px-1 py-2 text-center transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-feather-green bg-feather-green/10 text-feather-green'
                        : 'border-border text-muted-foreground hover:bg-surface-hover',
                    ].join(' ')}
                  >
                    <span className="text-sm font-extrabold">{preset.label}</span>
                    <span className="text-[0.65rem] font-bold">{preset.hz}</span>
                    <span className="text-[0.6rem] font-bold leading-tight opacity-80">
                      {preset.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            <label htmlFor="focus-volume" className="mt-4 block text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              Volume
            </label>
            <input
              id="focus-volume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="mt-2 w-full accent-[var(--color-feather-green)]"
            />

            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="flex flex-col">
                <span className="text-sm font-extrabold">Bruit rose</span>
                <span className="text-xs font-bold text-muted-foreground">Masque les distractions</span>
              </span>
              <Switch
                checked={state.pinkNoise}
                onChange={() => setPinkNoise(!state.pinkNoise)}
                label={state.pinkNoise ? 'Couper le bruit rose' : 'Activer le bruit rose'}
              />
            </div>
          </fieldset>

          {/* Discours produit honnête — aucune promesse de performance. */}
          <p className="mt-4 border-t border-border pt-3 text-xs font-bold leading-relaxed text-muted-foreground">
            Une ambiance qui aide certaines personnes à se détendre et à masquer les distractions.
            Les effets varient beaucoup d&apos;une personne à l&apos;autre. Si ça te gêne, coupe-le.
          </p>
        </div>
      )}
    </div>
  );
}

/** Interrupteur accessible (style Duolingo), `role="switch"`. */
const Switch = ({
  ref,
  checked,
  onChange,
  label,
}: {
  ref?: Ref<HTMLButtonElement>;
  checked: boolean;
  onChange: () => void;
  label: string;
}): ReactElement => (
  <button
    ref={ref}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={[
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      checked ? 'border-feather-green bg-feather-green' : 'border-border-strong bg-surface-hover',
    ].join(' ')}
  >
    <span
      aria-hidden="true"
      className={[
        'inline-block size-4 rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0.5',
      ].join(' ')}
    />
  </button>
);

/** Icône casque — décorative (le libellé est porté par `aria-label`). */
function HeadphonesIcon(): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.5" y="13.5" width="4" height="6.5" rx="1.6" />
      <rect x="17.5" y="13.5" width="4" height="6.5" rx="1.6" />
    </svg>
  );
}
