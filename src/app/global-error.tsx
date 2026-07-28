'use client';

import { useEffect } from 'react';

/**
 * Dernier filet de sécurité : intercepte les erreurs survenues dans le layout
 * racine, où `error.tsx` ne s'applique pas. Ce composant remplace entièrement
 * le document, il ne peut donc dépendre d'aucun style de l'application.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App] ❌ Exception critique :', error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#0f1115',
          color: '#f8fafc',
          fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ maxWidth: 560, width: '100%' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Une erreur critique est survenue
          </h1>
          <p style={{ color: '#94a3b8', marginTop: 0 }}>
            L&apos;application n&apos;a pas pu démarrer.
          </p>

          <pre
            style={{
              background: '#1e293b',
              borderRadius: 12,
              padding: 16,
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error.message || 'Erreur inconnue'}
            {error.digest ? `\n\nRéférence : ${error.digest}` : ''}
          </pre>

          <button
            onClick={reset}
            style={{
              background: '#ff6b2c',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 20px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
