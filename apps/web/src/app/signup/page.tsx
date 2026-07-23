import type { ReactElement } from 'react';

import { AuthForm } from '@/components/auth/auth-form';

/** Inscription — prénom + e-mail + mot de passe. */
export default function SignupPage(): ReactElement {
  return <AuthForm mode="signup" />;
}
