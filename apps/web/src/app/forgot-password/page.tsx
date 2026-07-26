import { Mascot } from '@bayt/ui';
import Link from 'next/link';
import type { ReactElement } from 'react';

/**
 * Mot de passe oublié — écran public **honnête**.
 *
 * Aucun e-mail automatique n'est envoyé (BAYT n'a pas encore de domaine
 * d'envoi) : la réinitialisation passe par l'administrateur, qui génère un lien
 * à usage unique depuis `/admin` et le transmet manuellement.
 */
export default function ForgotPasswordPage(): ReactElement {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
      <Mascot mood="encouraging" size="lg" priority />
      <h1 className="text-2xl font-black">Mot de passe oublié ?</h1>
      <p className="text-base font-bold leading-relaxed text-muted-foreground">
        Pas d&apos;envoi automatique pour l&apos;instant. Demande à ton administrateur BAYT de te
        générer un lien de réinitialisation : il te l&apos;enverra directement, et tu pourras
        choisir un nouveau mot de passe.
      </p>
      <Link href="/login" className="font-extrabold text-macaw underline underline-offset-2">
        Retour à la connexion
      </Link>
    </div>
  );
}
