import { redirect } from 'next/navigation';

/** L'unique parcours livre pour l'instant est la revision. */
export default function HomePage(): never {
  redirect('/review');
}
