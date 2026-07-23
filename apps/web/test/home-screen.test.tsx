import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LearningPath } from '@/lib/api/path-types';
import type { DailyStatus } from '@/lib/api/progress-types';
import type { DueQueue } from '@/lib/api/types';

const fetchPath = vi.fn<() => Promise<LearningPath>>();
const fetchDueQueue = vi.fn<() => Promise<DueQueue>>();
const fetchProgress = vi.fn<() => Promise<DailyStatus>>();

vi.mock('@/lib/api/client', () => ({
  DEMO_USER_ID: 'demo',
  API_URL: 'http://localhost:8787',
  fetchPath: () => fetchPath(),
  fetchDueQueue: () => fetchDueQueue(),
  fetchProgress: () => fetchProgress(),
}));

const { HomeScreen } = await import('@/components/home/home-screen');

const PATH: LearningPath = {
  units: [
    {
      id: 'u1',
      title: 'Fondamentaux de la mémorisation',
      color: 'green',
      lessons: [
        { id: 'lesson_demo', title: 'Les bases', state: 'completed' },
        { id: 'lesson_srs', title: 'Répétition espacée', state: 'available' },
        { id: 'lesson_pratique', title: 'Pratique de rappel', state: 'locked' },
      ],
    },
  ],
};

const EMPTY_PROGRESS: DailyStatus = {
  xpToday: 0,
  dailyGoal: 50,
  goalMet: false,
  ratio: 0,
  streak: 0,
  longestStreak: 0,
  xpTotal: 0,
};

function due(count: number): DueQueue {
  return {
    now: '2026-03-01T09:00:00.000Z',
    count,
    cards: Array.from({ length: count }, (_v, i) => ({
      item: { id: `c${String(i)}`, type: 'flashcard' as const, front: 'q', back: 'a' },
      scheduling: {
        state: 'new' as const,
        stability: 0,
        difficulty: 0,
        due: '2026-03-01T09:00:00.000Z',
        lastReviewedAt: null,
        reps: 0,
        lapses: 0,
      },
      retrievability: 0,
    })),
  };
}

function renderHome(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  render(<HomeScreen />, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchPath.mockResolvedValue(PATH);
  fetchProgress.mockResolvedValue(EMPTY_PROGRESS);
  fetchDueQueue.mockResolvedValue(due(3));
});

describe('HomeScreen', () => {
  it('montre la carte Réviser avec le nombre de cartes dues', async () => {
    renderHome();

    expect(await screen.findByText('3 cartes dues')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Réviser 3 cartes/ })).toHaveAttribute('href', '/review');
  });

  it('état calme quand aucune carte n\'est due', async () => {
    fetchDueQueue.mockResolvedValue(due(0));
    renderHome();

    expect(await screen.findByText('Rien à réviser')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Réviser/ })).not.toBeInTheDocument();
  });

  it('affiche le bandeau d\'unité et les nœuds avec leurs états', async () => {
    renderHome();

    expect(await screen.findByText('Fondamentaux de la mémorisation')).toBeInTheDocument();

    // Terminée → lien ; disponible → lien ; verrouillée → non-lien annoncé.
    expect(screen.getByRole('link', { name: /Les bases — terminée/ })).toHaveAttribute(
      'href',
      '/lesson/lesson_demo',
    );
    expect(screen.getByRole('link', { name: /Répétition espacée — disponible/ })).toHaveAttribute(
      'href',
      '/lesson/lesson_srs',
    );
    expect(screen.getByLabelText(/Pratique de rappel — verrouillée/)).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Pratique de rappel/ }),
    ).not.toBeInTheDocument();
  });

  it('la leçon disponible porte aria-current="step"', async () => {
    renderHome();

    const available = await screen.findByRole('link', { name: /Répétition espacée/ });
    expect(available).toHaveAttribute('aria-current', 'step');
  });
});
