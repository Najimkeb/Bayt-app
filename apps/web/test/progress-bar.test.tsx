import { ProgressBar } from '@bayt/ui';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/**
 * Preuve du remplissage : la barre reflète (éléments traités / total) et son
 * remplissage a une largeur ET une hauteur réelles (le bug était une hauteur
 * nulle héritée d'une classe Tailwind non compilée).
 */
describe('ProgressBar', () => {
  /** Le div de remplissage : premier enfant du role="progressbar". */
  function fillOf(container: HTMLElement): HTMLElement {
    const fill = container.querySelector('[role="progressbar"] > div');
    if (fill === null) {
      throw new Error('Remplissage introuvable');
    }
    return fill as HTMLElement;
  }

  it('remplit à 40 % quand 2 éléments sur 5 sont faits', () => {
    const { container } = render(<ProgressBar value={2 / 5} label="progression" />);

    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute('aria-valuenow', '40');

    const fill = fillOf(container);
    // Largeur = 40 %, appliquée en style inline.
    expect(fill.style.width).toBe('40%');
    // Hauteur réelle (pas de hauteur nulle invisible).
    expect(fill.style.height).toBe('100%');
  });

  it('reste vide à 0 % quand rien n\'est fait', () => {
    const { container } = render(<ProgressBar value={0} />);
    expect(fillOf(container).style.width).toBe('0%');
  });

  it('est plein à 100 % et borne les valeurs hors plage', () => {
    const { container } = render(<ProgressBar value={1.5} />);
    const fill = fillOf(container);
    expect(fill.style.width).toBe('100%');
    expect(fill.style.height).toBe('100%');
  });

  it('progresse par paliers (3 sur 5 → 60 %)', () => {
    const { container } = render(<ProgressBar value={3 / 5} />);
    expect(fillOf(container).style.width).toBe('60%');
  });
});
