'use client';

import type {
  CollectionReference,
  DocumentData,
  FirestoreError,
  Query,
} from 'firebase/firestore';
import type { InternalQuery } from '@/firebase/firestore/use-collection';

type Operation = 'get' | 'list';

/**
 * Explications actionnables pour les codes d'erreur Firestore les plus courants
 * en production. Le message brut du SDK reste affiché : pour un index manquant,
 * il contient le lien de création à ouvrir dans la console Firebase.
 */
const HINTS: Partial<Record<FirestoreError['code'], string>> = {
  'permission-denied':
    "Les règles de sécurité refusent cette lecture. Vérifiez que firestore.rules est bien déployé : firebase deploy --only firestore:rules",
  'failed-precondition':
    "Il manque probablement un index composite. Déployez-les avec : firebase deploy --only firestore:indexes (ou ouvrez le lien présent dans le message ci-dessus).",
  unavailable:
    'Firestore est injoignable : connexion réseau interrompue ou requête bloquée par le navigateur.',
  unauthenticated:
    "La requête est considérée comme non authentifiée par Firestore.",
};

/**
 * Journalise une erreur Firestore de façon exploitable.
 * Sans cela, l'erreur d'origine est perdue et le symptôme observé se réduit à
 * un écran d'erreur générique côté client.
 */
export function describeFirestoreError(
  error: FirestoreError,
  context: { operation: Operation; path: string }
) {
  const hint = HINTS[error.code];

  console.error(
    `[Firestore] ❌ ${context.operation} sur « ${context.path} » a échoué (code: ${error.code})\n` +
      `${error.message}` +
      (hint ? `\n→ ${hint}` : '')
  );
}

/**
 * Chemin lisible d'une requête ou d'une collection.
 * L'accès à `_query` relève de l'API interne du SDK : il est protégé pour ne
 * jamais provoquer une seconde erreur à l'intérieur du gestionnaire d'erreur.
 */
export function resolveQueryPath(
  target: CollectionReference<DocumentData> | Query<DocumentData>
): string {
  try {
    if (target.type === 'collection') {
      return (target as CollectionReference).path;
    }
    return (target as unknown as InternalQuery)._query.path.canonicalString();
  } catch {
    return 'requête Firestore';
  }
}
