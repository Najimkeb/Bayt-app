import type { ReactElement } from 'react';

import { AuthForm } from '@/components/auth/auth-form';

/** Connexion — e-mail + mot de passe. */
export default function LoginPage(): ReactElement {
  return <AuthForm mode="login" />;
}
