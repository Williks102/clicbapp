'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type { Competition, LiveAccess, Order, Vote } from '@/lib/types';

/** Vote enrichi du concours et du candidat concernés. */
export type EnrichedVote = {
  vote: Vote;
  competition: Competition | null;
};

/** Accès live enrichi du concours concerné. */
export type EnrichedLiveAccess = {
  access: LiveAccess;
  competition: Competition | null;
};

export type AccountActivity = {
  votes: EnrichedVote[];
  liveAccesses: EnrichedLiveAccess[];
  orders: Order[];
  totalVotesCast: number;
  totalSpent: number;
};

/** Charge des concours par lot (Firestore limite `in` à 30 valeurs). */
async function loadCompetitions(ids: string[]): Promise<Map<string, Competition>> {
  const map = new Map<string, Competition>();
  const uniqueIds = [...new Set(ids)].filter(Boolean);

  for (let i = 0; i < uniqueIds.length; i += 30) {
    const chunk = uniqueIds.slice(i, i + 30);
    const snapshot = await firestore
      .collection('competitions')
      .where('__name__', 'in', chunk)
      .get();

    snapshot.docs.forEach((doc) => {
      map.set(doc.id, { id: doc.id, ...doc.data() } as Competition);
    });
  }

  return map;
}

/**
 * Activité complète de l'utilisateur connecté : votes, accès live et commandes.
 */
export async function getAccountActivity(): Promise<{
  success: boolean;
  activity?: AccountActivity;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return {
        success: false,
        error: 'Vous devez être connecté pour consulter votre activité.',
      };
    }

    const [votesSnap, accessSnap, ordersSnap] = await Promise.all([
      firestore.collection('votes').where('userId', '==', session.user.id).get(),
      firestore.collection('liveAccess').where('userId', '==', session.user.id).get(),
      firestore
        .collection('orders')
        .where('customerEmail', '==', session.user.email)
        .get(),
    ]);

    const votes = votesSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Vote)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const accesses = accessSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as LiveAccess)
      .sort(
        (a, b) =>
          new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
      );

    const orders = ordersSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Order)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const competitions = await loadCompetitions([
      ...votes.map((v) => v.competitionId),
      ...accesses.map((a) => a.competitionId),
    ]);

    return {
      success: true,
      activity: {
        votes: votes.map((vote) => ({
          vote,
          competition: competitions.get(vote.competitionId) || null,
        })),
        liveAccesses: accesses.map((access) => ({
          access,
          competition: competitions.get(access.competitionId) || null,
        })),
        orders,
        totalVotesCast: votes.reduce((sum, vote) => sum + vote.quantity, 0),
        totalSpent: orders
          .filter((order) => order.status === 'PAID')
          .reduce((sum, order) => sum + order.amount, 0),
      },
    };
  } catch (error) {
    console.error('[GET ACCOUNT ACTIVITY] ❌', error);
    return {
      success: false,
      error: 'Une erreur est survenue lors de la récupération de votre activité.',
    };
  }
}
