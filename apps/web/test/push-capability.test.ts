import { afterEach, describe, expect, it, vi } from 'vitest';

import { getPushCapability } from '@/lib/push/web-push-client';

/**
 * Vérifie la porte de capacité push, avec l'accent sur la contrainte iOS :
 * push impossible tant que la PWA n'est pas installée (standalone).
 */

function setupEnv(options: {
  userAgent: string;
  standalone?: boolean;
  maxTouchPoints?: number;
  hasPush?: boolean;
}): void {
  const { userAgent, standalone = false, maxTouchPoints = 0, hasPush = true } = options;

  vi.stubGlobal('navigator', {
    userAgent,
    maxTouchPoints,
    ...(standalone ? { standalone: true } : {}),
    ...(hasPush ? { serviceWorker: {} } : {}),
  });

  const windowStub: Record<string, unknown> = {
    matchMedia: () => ({ matches: standalone }),
    navigator: { standalone },
  };
  if (hasPush) {
    windowStub.PushManager = function PushManager() {};
    windowStub.Notification = function Notification() {};
  }
  vi.stubGlobal('window', windowStub);
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPushCapability', () => {
  it('iOS dans un onglet (non installé) → il faut installer la PWA', () => {
    setupEnv({ userAgent: IPHONE, standalone: false });
    expect(getPushCapability()).toBe('needs-install-ios');
  });

  it('iOS installé (standalone) → push disponible', () => {
    setupEnv({ userAgent: IPHONE, standalone: true });
    expect(getPushCapability()).toBe('ready');
  });

  it('navigateur de bureau compatible → push disponible même en onglet', () => {
    setupEnv({ userAgent: CHROME, standalone: false });
    expect(getPushCapability()).toBe('ready');
  });

  it('navigateur sans PushManager → non pris en charge', () => {
    setupEnv({ userAgent: CHROME, standalone: false, hasPush: false });
    expect(getPushCapability()).toBe('unsupported');
  });
});
