import { MASCOT_POSES, Mascot, resolvePose, type MascotMood } from '@bayt/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/**
 * La regle qui rend la mascotte extensible sans risque : une humeur sans
 * illustration retombe sur `idle`. Ces tests verrouillent ce contrat — ajouter
 * une pose ne doit jamais pouvoir casser l'affichage.
 */
describe('Mascot — repli sur idle', () => {
  it('utilise la pose dediee quand elle existe', () => {
    expect(resolvePose('celebrating')).toBe(MASCOT_POSES.celebrating);
    expect(resolvePose('idle')).toBe(MASCOT_POSES.idle);
  });

  it.each<MascotMood>(['happy', 'encouraging'])(
    'retombe sur idle pour une humeur sans illustration : %s',
    (mood) => {
      expect(MASCOT_POSES[mood]).toBeUndefined();
      expect(resolvePose(mood)).toBe(MASCOT_POSES.idle);
    },
  );

  it('n\'expose que des poses reellement livrees', () => {
    for (const pose of Object.values(MASCOT_POSES)) {
      expect(pose.src).toMatch(/^\/mascot\/.+\.png$/);
      expect(pose.alt.length).toBeGreaterThan(10);
    }
  });
});

describe('Mascot — rendu', () => {
  it('affiche l\'illustration de la pose celebrating', () => {
    render(<Mascot mood="celebrating" size="lg" />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', MASCOT_POSES.celebrating?.alt);
  });

  it('affiche l\'illustration idle pour une humeur sans pose dediee', () => {
    render(<Mascot mood="happy" />);

    // L'alternative textuelle decrit ce qui est reellement montre.
    expect(screen.getByRole('img')).toHaveAttribute('alt', MASCOT_POSES.idle.alt);
  });

  it('respecte la taille demandee', () => {
    const { container } = render(<Mascot mood="idle" size="sm" />);
    const medallion = container.firstElementChild as HTMLElement;

    expect(medallion.style.width).toBe('56px');
    expect(medallion.style.height).toBe('56px');
  });
});
