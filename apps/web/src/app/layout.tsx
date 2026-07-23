import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import type { ReactElement, ReactNode } from 'react';

import { ProgressHeader } from '@/components/progress/progress-header';
import { ThemeToggle, themeInitScript } from '@/components/theme-toggle';

import './globals.css';
import { Providers } from './providers';

/**
 * Nunito — typographie ronde et grasse de la direction Duolingo.
 *
 * Les graisses 700/800/900 servent les titres et les boutons, 600/700 le corps.
 * Exposee via une variable CSS reprise par `--font-sans` (globals.css).
 */
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BAYT — Réviser',
  description:
    'BAYT — apprendre pour de bon : rappel actif, répétition espacée et un mentor qui vous accompagne.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#131f24' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="fr" className={nunito.variable} suppressHydrationWarning>
      <head>
        {/* Applique le thème avant la peinture : aucun flash au chargement. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh overflow-x-hidden antialiased">
        <Providers>
          {/* Lien d'évitement — premier arrêt de la navigation clavier. */}
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:shadow-lg"
          >
            Aller au contenu
          </a>

          <div className="flex min-h-dvh flex-col">
            <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-8 sm:py-5">
              <span className="flex min-w-0 items-baseline gap-2 truncate">
                <span className="text-xl font-black tracking-tight sm:text-2xl">BAYT</span>
                <span className="hidden truncate text-xs font-bold text-muted-foreground sm:inline">
                  apprendre pour de bon
                </span>
              </span>
              <div className="flex items-center gap-2 sm:gap-4">
                <ProgressHeader />
                <ThemeToggle />
              </div>
            </header>

            <main
              id="contenu"
              className="flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-2 sm:px-8 sm:pb-16"
            >
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
