'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * L'accès aux données temps réel passe par le hook `useRealtimeQuery`, qui
 * instancie lui-même le client Supabase : aucun fournisseur de contexte
 * supplémentaire n'est nécessaire.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
