'use client';

import { useEffect, useState, type ReactElement } from 'react';

type Theme = 'light' | 'dark';

/** Cle de persistance du choix explicite de l'apprenant. */
export const THEME_STORAGE_KEY = 'bayt-theme';

/**
 * Bascule clair / sombre.
 *
 * Par defaut, BAYT suit le systeme. Des que l'apprenant choisit, son choix est
 * memorise et prime — mais on ne l'impose jamais au premier chargement.
 */
export function ThemeToggle(): ReactElement {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  function toggle(): void {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';

    document.documentElement.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    setTheme(next);
  }

  const isDark = theme === 'dark';

  return (
    // Bouton d'icône du header : discret, pas un CTA pressable coloré.
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" strokeWidth="1.8">
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4" stroke="currentColor" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={angle}
                x1="12"
                y1="2.5"
                x2="12"
                y2="5"
                stroke="currentColor"
                strokeLinecap="round"
                transform={`rotate(${String(angle)} 12 12)`}
              />
            ))}
          </>
        ) : (
          <path
            d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
            stroke="currentColor"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}

/**
 * Script applique avant le premier rendu, pour eviter le flash de theme.
 *
 * Injecte tel quel dans le `<head>` : il doit s'executer avant la peinture,
 * donc avant que React ne prenne la main.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (stored === null && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (error) {
    /* Mode navigation privee : on retombe simplement sur le theme clair. */
  }
})();
`;
