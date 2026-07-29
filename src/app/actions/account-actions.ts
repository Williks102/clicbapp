'use server';

import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { toCompetition, toLiveAccess, toOrder, toVote } from '@/lib/supabase/mappers';
import type {
  CompetitionRow,
  LiveAccessRow,
  OrderRow,
  VoteRow,
} from '@/lib/supabase/types';
import type { Competition, LiveAccess, Order, Vote } from '@/lib/types';

export type EnrichedVote = {
  vote: Vote;
  competition: Competition | null;
};

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

/** Ligne accompagnée du concours joint par la requête. */
type WithCompetition<T> = T & { competition: CompetitionRow | null };

/**
 * Activité complète de l'utilisateur connecté : votes, accès live et commandes.
 *
 * Les concours sont ramenés par jointure, ce qui évite la série de requêtes
 * supplémentaires qu'imposait le modèle documentaire.
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

    const supabase = getSupabaseAdmin();

    const [votesResult, accessResult, ordersResult] = await Promise.all([
      supabase
        .from('votes')
        .select('*, competition:competitions(*, vote_packs(*))')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('live_access')
        .select('*, competition:competitions(*, vote_packs(*))')
        .eq('user_id', session.user.id)
        .order('purchase_date', { ascending: false }),
      supabase
        .from('orders')
        .select('*')
        .eq('customer_email', session.user.email)
        .order('created_at', { ascending: false }),
    ]);

    const firstError = votesResult.error || accessResult.error || ordersResult.error;
    if (firstError) throw new Error(firstError.message);

    const voteRows = (votesResult.data ?? []) as unknown as WithCompetition<VoteRow>[];
    const accessRows = (accessResult.data ?? []) as unknown as WithCompetition<LiveAccessRow>[];
    const orderRows = (ordersResult.data ?? []) as OrderRow[];

    const votes = voteRows.map((row) => ({
      vote: toVote(row),
      competition: row.competition ? toCompetition(row.competition) : null,
    }));

    const liveAccesses = accessRows.map((row) => ({
      access: toLiveAccess(row),
      competition: row.competition ? toCompetition(row.competition) : null,
    }));

    const orders = orderRows.map(toOrder);

    return {
      success: true,
      activity: {
        votes,
        liveAccesses,
        orders,
        totalVotesCast: votes.reduce((sum, entry) => sum + entry.vote.quantity, 0),
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
