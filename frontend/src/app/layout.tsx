import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'ImmoGest — Gestion Immobilière SaaS',
  description: 'Plateforme SaaS moderne de gestion immobilière multi-rôles : propriétaires, locataires, contrats, paiements et dépenses.',
  keywords: ['gestion immobilière', 'SaaS', 'loyer', 'propriétaire', 'locataire'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#4caf50', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#f44336', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
