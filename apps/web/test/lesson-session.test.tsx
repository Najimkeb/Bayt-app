import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnswerResult, Lesson } from '@/lib/api/lesson-types';

const fetchLesson = vi.fn<() => Promise<Lesson>>();
const submitAnswer = vi.fn<() => Promise<AnswerResult>>();

vi.mock('@/lib/api/client', () => ({
  DEMO_USER_ID: 'demo',
  API_URL: 'http://localhost:8787',
  fetchLesson: () => fetchLesson(),
  submitAnswer: () => submitAnswer(),
}));

const { LessonSession } = await import('@/components/lesson/lesson-session');

const LESSON: Lesson = {
  id: 'l1',
  title: 'Fondamentaux',
  exercises: [
    { id: 'x1', type: 'mcq', prompt: 'Base SQL de Cloudflare ?', options: ['R2', 'D1', 'KV'] },
    { id: 'x2', type: 'fill_blank', prompt: 'Auteur de la courbe de l’oubli ?' },
  ],
};

function renderLesson(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  render(<LessonSession lessonId="l1" />, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchLesson.mockResolvedValue(LESSON);
});

describe('LessonSession', () => {
  it('affiche le premier exercice et sa progression', async () => {
    renderLesson();

    expect(await screen.findByText('Base SQL de Cloudflare ?')).toBeInTheDocument();
    expect(screen.getByText('0 / 2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('« Vérifier » est désactivé tant qu\'aucune réponse n\'est choisie', async () => {
    renderLesson();
    await screen.findByText('Base SQL de Cloudflare ?');

    expect(screen.getByRole('button', { name: 'Vérifier' })).toBeDisabled();
  });

  it('bonne réponse → feedback vert, progression avance, exercice suivant', async () => {
    submitAnswer.mockResolvedValue({
      correct: true,
      grade: 'Good',
      correction: { type: 'mcq', answerIndex: 1, answerText: 'D1' },
      intervalMs: 600_000,
    });
    const user = userEvent.setup();
    renderLesson();
    await screen.findByText('Base SQL de Cloudflare ?');

    await user.click(screen.getByRole('radio', { name: /D1/ }));
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));

    expect(await screen.findByText('Correct !')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    // 1/2 fait, on passe au texte à trous (identifié par son champ de saisie).
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });
    expect(await screen.findByPlaceholderText('Écris ta réponse…')).toBeInTheDocument();
  });

  it('mauvaise réponse → feedback rouge avec la bonne réponse, exercice re-mis en file', async () => {
    submitAnswer.mockResolvedValue({
      correct: false,
      grade: 'Again',
      correction: { type: 'mcq', answerIndex: 1, answerText: 'D1' },
      intervalMs: 60_000,
    });
    const user = userEvent.setup();
    renderLesson();
    await screen.findByText('Base SQL de Cloudflare ?');

    await user.click(screen.getByRole('radio', { name: /R2/ }));
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));

    const feedback = await screen.findByRole('status');
    expect(within(feedback).getByText('Pas tout à fait')).toBeInTheDocument();
    // La bonne réponse est affichée dans le feedback.
    expect(within(feedback).getByText('D1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    // Toujours 0/2 : l'exercice raté revient, la progression n'a pas avancé.
    await waitFor(() => {
      expect(screen.getByText('0 / 2')).toBeInTheDocument();
    });
  });

  it('sélectionne une option QCM au clavier (touche 2)', async () => {
    const user = userEvent.setup();
    renderLesson();
    await screen.findByText('Base SQL de Cloudflare ?');

    await user.keyboard('2');

    expect(screen.getByRole('radio', { name: /D1/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Vérifier' })).toBeEnabled();
  });
});
