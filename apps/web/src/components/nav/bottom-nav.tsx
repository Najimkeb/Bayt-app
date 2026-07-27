'use client';

import { Home, Library, User, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';

import { useDueCount } from '@/lib/api/reminder-queries';
import { useUserId } from '@/lib/auth/use-user-id';

/** Onglets de la barre basse. */
const TABS: readonly { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: '/', label: 'Accueil', icon: Home, match: (p) => p === '/' },
  { href: '/library', label: 'Bibliothèque', icon: Library, match: (p) => p.startsWith('/library') },
  { href: '/profil', label: 'Profil', icon: User, match: (p) => p.startsWith('/profil') },
];

/**
 * Écrans SANS barre basse : les pages en pleine tâche (révision, leçon — elles
 * ont leur propre bouton « Quitter ») et les écrans publics d'authentification.
 */
function isHidden(pathname: string): boolean {
  return (
    pathname === '/review' ||
    pathname === '/quiz' ||
    pathname.startsWith('/lesson/') ||
    pathname.startsWith('/admin/lessons/') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/reset-password' ||
    pathname === '/forgot-password'
  );
}

/**
 * Barre de navigation basse persistante, style Duolingo — **mobile uniquement**
 * (`sm:hidden`). Accueil / Bibliothèque / Profil, l'onglet actif mis en évidence
 * (couleur d'accent + `aria-current`).
 *
 * Masquée sur les écrans en pleine tâche et d'authentification.
 */
export function BottomNav(): ReactElement | null {
  const pathname = usePathname();
  const userId = useUserId();
  const dueCount = useDueCount(userId).data?.count ?? 0;

  if (isHidden(pathname)) {
    return null;
  }

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          // Badge « cartes dues » sur l'accueil (masqué à zéro), 99+ au-delà.
          const badge = tab.href === '/' && dueCount > 0 ? (dueCount > 99 ? '99+' : String(dueCount)) : null;

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                  active ? 'text-fox-orange' : 'text-muted-foreground'
                }`}
              >
                <span className="relative">
                  <Icon aria-hidden="true" className="size-6" strokeWidth={active ? 2.6 : 2} />
                  {badge !== null && (
                    <span
                      className="absolute -right-2.5 -top-1.5 min-w-[1.1rem] rounded-full border-2 border-surface bg-cardinal px-1 text-[0.6rem] font-black leading-4 text-white tabular-nums"
                      aria-label={`${String(dueCount)} carte${dueCount > 1 ? 's' : ''} à réviser`}
                    >
                      {badge}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
