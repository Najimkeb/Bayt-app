import type { Metadata, Viewport } from 'next';
import type { ReactElement, ReactNode } from 'react';

import { ThemeToggle, themeInitScript } from '@/components/theme-toggle';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'BAYT — Reviser',
  description:
    'BAYT — apprendre pour de bon : rappel actif, repetition espacee et un mentor qui vous accompagne.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf7f2' },
    { media: '(prefers-color-scheme: dark)', color: '#14100d' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Applique le theme avant la peinture : aucun flash au chargement. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <Providers>
          {/* Lien d'evitement — premier arret de la navigation clavier. */}
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
          >
            Aller au contenu
          </a>

          <div className="flex min-h-dvh flex-col">
            <header className="flex items-center justify-between px-5 py-4 sm:px-8">
              <span className="text-base font-semibold tracking-tight">
                BAYT
                <span className="ml-2 align-middle text-xs font-medium text-muted-foreground">
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
