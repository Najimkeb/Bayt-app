import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import type { ReactElement, ReactNode } from 'react';

import Link from 'next/link';

import { FocusSound } from '@/components/audio/focus-sound';
import { AuthGate } from '@/components/auth/auth-gate';
import { BottomNav } from '@/components/nav/bottom-nav';
import { SyncIndicator } from '@/components/offline/sync-indicator';
import { RegisterServiceWorker } from '@/components/offline/register-sw';
import { ProfileLink } from '@/components/profile/profile-link';
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
  title: 'BAYT : Réviser',
  description:
    'BAYT, apprendre pour de bon : rappel actif, répétition espacée et un mentor qui vous accompagne.',
  applicationName: 'BAYT',
  manifest: '/manifest.webmanifest',
  // Ouverture plein écran depuis l'écran d'accueil iOS (sans barre Safari).
  appleWebApp: {
    capable: true,
    title: 'BAYT',
    statusBarStyle: 'default',
  },
  // Icône d'accueil : fond plein (le renard sur crème), jamais transparente —
  // iOS rendrait la transparence en noir. Coins non arrondis (iOS applique son
  // masque). 180 est la principale iPhone ; 152/167 pour iPad.
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon-152.png', sizes: '152x152', type: 'image/png' },
      { url: '/apple-touch-icon-167.png', sizes: '167x167', type: 'image/png' },
    ],
  },
  // Équivalent standardisé de `apple-mobile-web-app-capable` (Chrome/Android).
  other: { 'mobile-web-app-capable': 'yes' },
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
          <RegisterServiceWorker />
          {/* Lien d'évitement — premier arrêt de la navigation clavier. */}
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:shadow-lg"
          >
            Aller au contenu
          </a>

          <div className="flex min-h-dvh flex-col">
            <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-8 sm:py-5">
              {/* Logo cliquable partout : retour à l'accueil. */}
              <Link
                href="/"
                aria-label="Retour à l'accueil"
                className="flex min-w-0 items-baseline gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {/* Le wordmark ne se rogne jamais (`shrink-0`) ; seule la
                    baseline (desktop) tronque si la place manque. */}
                <span className="shrink-0 text-xl font-black tracking-tight sm:text-2xl">BAYT</span>
                <span className="hidden min-w-0 truncate text-xs font-bold text-muted-foreground sm:inline">
                  apprendre pour de bon
                </span>
              </Link>
              <div className="flex items-center gap-2 sm:gap-4">
                <SyncIndicator />
                <ProgressHeader />
                <FocusSound />
                <ThemeToggle />
                <ProfileLink />
              </div>
            </header>

            <main
              id="contenu"
              // Padding bas mobile : dégage la barre de navigation basse fixe
              // (hauteur + safe-area) pour que rien ne soit masqué dessous.
              className="flex flex-1 flex-col items-center justify-center px-4 pt-2 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-8 sm:pb-16"
            >
              <AuthGate>{children}</AuthGate>
            </main>
          </div>

          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
