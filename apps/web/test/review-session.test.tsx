import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DueQueue, Preview, ReviewResult } from '@/lib/api/types';

/**
 * Le client HTTP est remplace : ces tests portent sur la boucle de revision
 * (reveler, noter, enchainer, clavier), pas sur le reseau.
 */
const fetchDueQueue = vi.fn<() => Promise<DueQueue>>();
const fetchPreview = vi.fn<() => Promise<Preview>>();
const submitReview = vi.fn<() => Promise<ReviewResult>>();

vi.mock('@/lib/api/client', () => ({
  DEMO_USER_ID: 'demo',
  API_URL: 'http://localhost:8787',
  ApiError: class ApiError extends Error {},
  fetchDueQueue: () => fetchDueQueue(),
  fetchPreview: () => fetchPreview(),
  submitReview: () => submitReview(),
}));

const { ReviewSession } = await import('@/components/review/review-session');

const MINUTE = 60_000;

function card(id: string, front: string, back: string): DueQueue['cards'][number] {
  return {
    item: { id, type: 'flashcard', front, back },
    scheduling: {
      state: 'new',
      stability: 0,
      difficulty: 0,
      due: '2026-03-01T09:00:00.000Z',
      lastReviewedAt: null,
      reps: 0,
      lapses: 0,
    },
    retrievability: 0,
  };
}

const FIRST_CARD = card('item-a', 'Capitale du Maroc ?', 'Rabat');

const QUEUE: DueQueue = {
  now: '2026-03-01T09:00:00.000Z',
  count: 2,
  cards: [FIRST_CARD, card('item-b', 'Capitale de la Tunisie ?', 'Tunis')],
};

const PREVIEW: Preview = {
  itemId: 'item-a',
  now: '2026-03-01T09:00:00.000Z',
  outcomes: [
    { grade: 'Again', intervalMs: MINUTE, due: '2026-03-01T09:01:00.000Z' },
    { grade: 'Hard', intervalMs: 6 * MINUTE, due: '2026-03-01T09:06:00.000Z' },
    { grade: 'Good', intervalMs: 10 * MINUTE, due: '2026-03-01T09:10:00.000Z' },
    { grade: 'Easy', intervalMs: 4 * 24 * 60 * MINUTE, due: '2026-03-05T09:00:00.000Z' },
  ],
};

function renderSession(): ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  render(<ReviewSession />, { wrapper: Wrapper });

  return <ReviewSession />;
}

/** Texte de la face visible : la face cachee est hors de l'arbre d'accessibilite. */
function questionText(): Promise<HTMLElement> {
  return screen.findByRole('group', { name: 'Question' });
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchDueQueue.mockResolvedValue(QUEUE);
  fetchPreview.mockResolvedValue(PREVIEW);
  submitReview.mockResolvedValue({
    item: FIRST_CARD.item,
    scheduling: FIRST_CARD.scheduling,
    review: {
      grade: 'Good',
      reviewedAt: '2026-03-01T09:00:00.000Z',
      intervalMs: 10 * MINUTE,
    },
  });
});

describe('Ecran de revision', () => {
  it('affiche la premiere carte et le nombre de cartes restantes', async () => {
    renderSession();

    expect(within(await questionText()).getByText('Capitale du Maroc ?')).toBeInTheDocument();
    expect(screen.getByText('2 cartes restantes')).toBeInTheDocument();
  });

  it('ne montre les notes qu\'une fois la reponse revelee', async () => {
    const user = userEvent.setup();
    renderSession();

    await questionText();
    expect(screen.queryByRole('group', { name: 'Noter mon rappel' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Révéler la réponse' }));

    expect(await screen.findByRole('group', { name: 'Noter mon rappel' })).toBeInTheDocument();
  });

  it('affiche l\'intervalle prevu sous chaque note', async () => {
    const user = userEvent.setup();
    renderSession();

    await questionText();
    await user.click(screen.getByRole('button', { name: 'Révéler la réponse' }));

    // Les intervalles viennent de l'API : le front ne les calcule jamais.
    expect(
      await screen.findByRole('button', {
        name: /Correct — Rappel correct, prochaine révision dans 10 minutes/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /À revoir — Je ne savais pas, prochaine révision dans 1 minutes/ }),
    ).toBeInTheDocument();
  });

  it('enchaine sur la carte suivante apres une note', async () => {
    const user = userEvent.setup();
    renderSession();

    await questionText();
    await user.click(screen.getByRole('button', { name: 'Révéler la réponse' }));
    await user.click(await screen.findByRole('button', { name: /Correct/ }));

    expect(
      within(await screen.findByRole('group', { name: 'Question' })).getByText(
        'Capitale de la Tunisie ?',
      ),
    ).toBeInTheDocument();
    // La carte suivante repart cachee.
    expect(screen.getByRole('button', { name: 'Révéler la réponse' })).toBeInTheDocument();
  });

  it('celebre la fin de session quand la file est vide', async () => {
    fetchDueQueue.mockResolvedValue({ now: QUEUE.now, count: 0, cards: [] });
    renderSession();

    expect(await screen.findByRole('heading', { name: 'Tout est révisé !' })).toBeInTheDocument();
  });

  it('signale clairement une API injoignable', async () => {
    fetchDueQueue.mockRejectedValue(new Error('offline'));
    renderSession();

    expect(await screen.findByRole('alert')).toHaveTextContent('injoignable');
  });

  it('n\'affiche jamais la syntaxe cloze brute', async () => {
    const base = card('item-cloze', 'La courbe de {{c1::Ebbinghaus}} est nette', 'Ebbinghaus');
    const cloze = { ...base, item: { ...base.item, type: 'cloze' as const } };
    fetchDueQueue.mockResolvedValue({ now: QUEUE.now, count: 1, cards: [cloze] });
    const user = userEvent.setup();
    renderSession();

    const front = await questionText();
    expect(front.textContent).not.toContain('{{');
    expect(front.textContent).toContain('La courbe de');

    await user.click(screen.getByRole('button', { name: 'Révéler la réponse' }));
    const back = await screen.findByRole('group', { name: 'Réponse' });
    expect(back.textContent).not.toContain('{{');
    expect(back.textContent).toContain('Ebbinghaus');
  });

  it('remplit la barre de progression au fil des notes', async () => {
    const user = userEvent.setup();
    renderSession();

    await questionText();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');

    await user.click(screen.getByRole('button', { name: 'Révéler la réponse' }));
    await user.click(await screen.findByRole('button', { name: /Correct/ }));

    // 1 carte notée sur 2 → 50 %.
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    });
  });
});

describe('Accessibilite clavier', () => {
  it('revele la reponse avec la barre d\'espace', async () => {
    const user = userEvent.setup();
    renderSession();

    await questionText();
    await user.keyboard(' ');

    expect(await screen.findByRole('group', { name: 'Noter mon rappel' })).toBeInTheDocument();
  });

  it('note avec les touches 1 a 4', async () => {
    const user = userEvent.setup();
    renderSession();

    await questionText();
    await user.keyboard(' ');
    await screen.findByRole('group', { name: 'Noter mon rappel' });

    await user.keyboard('3');

    await waitFor(() => {
      expect(submitReview).toHaveBeenCalledTimes(1);
    });
    expect(within(await questionText()).getByText('Capitale de la Tunisie ?')).toBeInTheDocument();
  });

  it('ignore les touches de notation tant que la reponse est cachee', async () => {
    const user = userEvent.setup();
    renderSession();

    await questionText();
    await user.keyboard('3');

    expect(submitReview).not.toHaveBeenCalled();
  });

  it('expose les raccourcis sur chaque bouton de note', async () => {
    const user = userEvent.setup();
    renderSession();

    await questionText();
    await user.keyboard(' ');

    const again = await screen.findByRole('button', { name: /À revoir/ });
    expect(again).toHaveAttribute('aria-keyshortcuts', '1');
  });
});
