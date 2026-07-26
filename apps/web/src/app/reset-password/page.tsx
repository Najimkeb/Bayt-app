import { Suspense, type ReactElement } from 'react';

import { ResetPasswordForm } from '@/components/auth/reset-password-form';

/**
 * Écran public de réinitialisation de mot de passe (`/reset-password?token=…`).
 *
 * `Suspense` borne `useSearchParams` (lecture du jeton) côté client ; la
 * validité du jeton est jugée par l'API à la soumission.
 */
export default function ResetPasswordPage(): ReactElement {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
