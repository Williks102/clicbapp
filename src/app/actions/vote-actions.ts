'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { toVote } from '@/lib/supabase/mappers';
import type { CompetitionRow, VoteRow } from '@/lib/supabase/types';
import type { Vote, VoteResult } from '@/lib/types';

/** Messages renvoyés par la fonction `cast_free_vote`. */
const VOTE_ERRORS: Record<string, string> = {
  COMPETITION_NOT_FOUND: 'Concours introuvable.',
  CANDIDATE_NOT_FOUND: "Ce candidat ne participe pas à ce concours.",
  CANDIDATE_ELIMINATED: 'Ce candidat est éliminé, vous ne pouvez plus voter pour lui.',
  FREE_VOTE_DISABLED: "Le vote gratuit n'est pas activé pour ce concours.",
  VOTING_CLOSED: 'Les votes ne sont pas ouverts pour ce concours.',
  USER_NOT_ALLOWED: "Votre compte n'autorise pas le vote.",
};

function translateVoteError(message: string): string | null {
  const key = Object.keys(VOTE_ERRORS).find((code) => message.includes(code));
  return key ? VOTE_ERRORS[key] : null;
}

/**
 * État du vote gratuit pour l'utilisateur courant sur un concours.
 */
export async function getFreeVoteStatus(competitionId: string): Promise<{
  available: boolean;
  requiresLogin: boolean;
  nextFreeVoteAt?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { available: false, requiresLogin: true };
  }

  const supabase = getSupabaseAdmin();

  const { data: competitionData } = await supabase
    .from('competitions')
    .select('status, voting_starts_at, voting_ends_at, free_vote_enabled, free_vote_cooldown_hours')
    .eq('id', competitionId)
    .maybeSingle();

  if (!competitionData) return { available: false, requiresLogin: false };

  const competition = competitionData as Pick<
    CompetitionRow,
    | 'status'
    | 'voting_starts_at'
    | 'voting_ends_at'
    | 'free_vote_enabled'
    | 'free_vote_cooldown_hours'
  >;

  const now = Date.now();
  const votingOpen =
    competition.status === 'voting' &&
    now >= new Date(competition.voting_starts_at).getTime() &&
    now <= new Date(competition.voting_ends_at).getTime();

  if (!competition.free_vote_enabled || !votingOpen) {
    return { available: false, requiresLogin: false };
  }

  const { data: claim } = await supabase
    .from('free_vote_claims')
    .select('last_voted_at')
    .eq('user_id', session.user.id)
    .eq('competition_id', competitionId)
    .maybeSingle();

  if (!claim) return { available: true, requiresLogin: false };

  const nextAt =
    new Date((claim as { last_voted_at: string }).last_voted_at).getTime() +
    competition.free_vote_cooldown_hours * 60 * 60 * 1000;

  if (now >= nextAt) return { available: true, requiresLogin: false };

  return {
    available: false,
    requiresLogin: false,
    nextFreeVoteAt: new Date(nextAt).toISOString(),
  };
}

/**
 * Enregistre le vote gratuit d'un utilisateur connecté.
 *
 * Toute la logique — contrôle du délai, enregistrement du vote, mise à jour des
 * compteurs — est exécutée par la fonction PostgreSQL `cast_free_vote` dans une
 * seule transaction : deux requêtes concurrentes ne peuvent pas produire deux
 * votes gratuits.
 */
export async function castFreeVote(
  competitionId: string,
  candidateId: string
): Promise<VoteResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Connectez-vous pour utiliser votre vote gratuit.',
      };
    }

    const { data, error } = await getSupabaseAdmin().rpc('cast_free_vote', {
      p_user_id: session.user.id,
      p_competition_id: competitionId,
      p_candidate_id: candidateId,
    });

    if (error) {
      if (error.message.includes('FREE_VOTE_COOLDOWN')) {
        const status = await getFreeVoteStatus(competitionId);
        const when = status.nextFreeVoteAt
          ? ` Prochain vote possible le ${new Date(status.nextFreeVoteAt).toLocaleString('fr-FR')}.`
          : '';
        return {
          success: false,
          error: `Vous avez déjà utilisé votre vote gratuit.${when}`,
        };
      }

      const translated = translateVoteError(error.message);
      if (translated) return { success: false, error: translated };

      throw new Error(error.message);
    }

    const result = (data as Array<{ new_vote_count: number; next_free_vote_at: string }>)?.[0];

    revalidatePath(`/competitions/${competitionId}`);
    revalidatePath(`/competitions/${competitionId}/candidates/${candidateId}`);

    return {
      success: true,
      message: 'Votre vote gratuit a bien été pris en compte !',
      newVoteCount: result?.new_vote_count,
      nextFreeVoteAt: result?.next_free_vote_at,
    };
  } catch (error) {
    console.error('[CAST FREE VOTE] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

/** Historique des votes de l'utilisateur connecté. */
export async function getMyVotes(): Promise<Vote[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const { data, error } = await getSupabaseAdmin()
    .from('votes')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET MY VOTES] ❌', error.message);
    return [];
  }

  return (data as VoteRow[]).map(toVote);
}
