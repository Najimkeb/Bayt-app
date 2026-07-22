import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import type { ReactElement, ReactNode } from 'react';

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
      <body className="min-h-dvh antialiased">
        <Providers>
          {/* Lien d'évitement — premier arrêt de la navigation clavier. */}
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:shadow-lg"
          >
            Aller au contenu
          </a>

          <div className="flex min-h-dvh flex-col">
            <header className="flex items-center justify-between px-5 py-4 sm:px-8">
              <span className="text-lg font-extrabold tracking-tight">
                BAYT
                <span className="ml-2 align-middle text-xs font-bold text-muted-foreground">
                  apprendre pour de bon
                </span>
              </span>
              <ThemeToggle />
            </header>

            <main
              id="contenu"
              className="flex flex-1 flex-col items-center justify-center px-5 pb-16 sm:px-8"
            >
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
