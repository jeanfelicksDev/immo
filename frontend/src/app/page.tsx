import { redirect } from 'next/navigation';

// Redirection de la racine vers le dashboard
export default function HomePage() {
  redirect('/login');
}
