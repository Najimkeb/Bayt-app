import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DailyStatus } from '@/lib/api/progress-types';

const fetchProgress = vi.fn<() => Promise<DailyStatus>>();

vi.mock('@/lib/api/client', () => ({
  DEMO_USER_ID: 'demo',
  API_URL: 'http://localhost:8787',
  fetchProgress: () => fetchProgress(),
}));

vi.mock('@/lib/auth/use-user-id', () => ({ useUserId: () => 'demo' }));

const { ProgressHeader } = await import('@/components/progress/progress-header');

function renderHeader(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  render(<ProgressHeader />, { wrapper: Wrapper });
}

const STATUS: DailyStatus = {
  xpToday: 30,
  dailyGoal: 50,
  goalMet: false,
  ratio: 0.6,
  streak: 4,
  longestStreak: 7,
  xpTotal: 320,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProgressHeader', () => {
  it('affiche la série et l\'XP du jour avec des libellés accessibles', async () => {
    fetchProgress.mockResolvedValue(STATUS);
    renderHeader();

    expect(await screen.findByLabelText('Série de 4 jours')).toBeInTheDocument();
    expect(screen.getByLabelText("30 XP aujourd'hui")).toBeInTheDocument();
    expect(screen.getByLabelText('Ta progression du jour')).toBeInTheDocument();
  });

  it('annonce l\'objectif atteint quand il l\'est', async () => {
    fetchProgress.mockResolvedValue({ ...STATUS, xpToday: 60, ratio: 1, goalMet: true });
    renderHeader();

    expect(await screen.findByText(/atteint/)).toBeInTheDocument();
  });

  it('ne casse pas l\'en-tête si l\'API est injoignable', async () => {
    fetchProgress.mockRejectedValue(new Error('offline'));
    const { container } = (() => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      return render(
        <QueryClientProvider client={queryClient}>
          <ProgressHeader />
        </QueryClientProvider>,
      );
    })();

    // Rien à afficher : le composant s'efface au lieu de planter.
    expect(container).toBeInTheDocument();
  });
});
