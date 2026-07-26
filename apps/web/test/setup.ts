import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * `next/navigation` n'a pas de contexte de routeur hors app Next : on le
 * neutralise pour que les composants qui l'utilisent (bouton « Quitter »,
 * barre basse) se rendent en test sans routeur réel.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * Framer Motion s'appuie sur des API absentes de jsdom : on les neutralise
 * pour que les tests portent sur le comportement, pas sur l'animation.
 */
globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof globalThis.matchMedia;
