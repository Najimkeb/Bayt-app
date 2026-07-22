import '@testing-library/jest-dom/vitest';

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
