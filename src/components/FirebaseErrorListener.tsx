'use client';

import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Écoute les refus des règles de sécurité Firestore émis globalement.
 *
 * En développement, l'erreur est relancée pour apparaître dans l'overlay Next.js
 * avec le détail de la requête refusée.
 *
 * En production, elle est seulement journalisée : ce composant est monté à la
 * racine de l'application, la relancer ferait tomber toute l'interface — y
 * compris les parties qui n'ont pas besoin de la donnée refusée. Les composants
 * de lecture exposent déjà leur propre état d'erreur.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (permissionError: FirestorePermissionError) => {
      console.error('[Firestore] ⛔ Accès refusé par les règles de sécurité.');
      console.error(permissionError.message);

      if (process.env.NODE_ENV === 'development') {
        setError(permissionError);
      }
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  if (error) {
    throw error;
  }

  return null;
}
