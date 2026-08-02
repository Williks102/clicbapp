'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { UserFacingError, userMessage } from '@/lib/errors';
import { toCompetition, toLiveAccess } from '@/lib/supabase/mappers';
import {
  COMPETITION_COLUMNS,
  type CompetitionRow,
  type LiveAccessRow,
} from '@/lib/supabase/types';
import { PUBLIC_COMPETITION_STATUSES } from '@/lib/live-utils';
import { checkLiveUrl } from '@/lib/live-url';
import type { ActionResult, Competition, LiveAccess } from '@/lib/types';

async function requireLiveControl(competitionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UserFacingError('Vous devez être connecté.');
  }

  const { data, error } = await getSupabaseAdmin()
    .from('competitions')
    .select('id, organizer_id, live_enabled, live_url, live_provider')
    .eq('id', competitionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new UserFacingError('Concours introuvable.');

  const competition = data as Pick<
    CompetitionRow,
    'id' | 'organizer_id' | 'live_enabled' | 'live_url' | 'live_provider'
  >;

  if (competition.organizer_id !== session.user.id && session.user.role !== 'admin') {
    throw new UserFacingError("Vous n'êtes pas autorisé à piloter ce direct.");
  }

  return { user: session.user, competition };
}

/** Lance ou coupe le direct depuis la régie de l'organisateur. */
export async function setLiveStatus(
  competitionId: string,
  isLive: boolean
): Promise<ActionResult> {
  try {
    const { competition } = await requireLiveControl(competitionId);

    if (!competition.live_enabled) {
      return {
        success: false,
        error: "La diffusion n'est pas activée pour ce concours.",
      };
    }
    if (isLive && !competition.live_url) {
      return {
        success: false,
        error: "Renseignez l'URL du flux avant de lancer le direct.",
      };
    }

    const { error } = await getSupabaseAdmin()
      .from('competitions')
      .update({ live_is_live: isLive })
      .eq('id', competitionId);

    if (error) throw new Error(error.message);

    revalidatePath(`/competitions/${competitionId}`);
    revalidatePath(`/competitions/${competitionId}/live`);
    revalidatePath('/');

    return {
      success: true,
      message: isLive ? 'Le direct est lancé.' : 'Le direct est terminé.',
    };
  } catch (error) {
    console.error('[SET LIVE STATUS] ❌', error);
    return {
      success: false,
      error: userMessage(error, 'Erreur inconnue.'),
    };
  }
}

/** Met à jour l'URL du flux sans repasser par le formulaire complet. */
export async function updateLiveUrl(
  competitionId: string,
  url: string
): Promise<ActionResult> {
  try {
    const { competition } = await requireLiveControl(competitionId);

    /*
     * Ce point d'entrée court-circuite le formulaire complet : sans ce
     * contrôle, il offrirait un moyen d'écrire une adresse arbitraire dans le
     * `src` de l'iframe du direct.
     */
    const check = checkLiveUrl(competition.live_provider, url);
    if (!check.ok) {
      return { success: false, error: check.error };
    }

    const { error } = await getSupabaseAdmin()
      .from('competitions')
      .update({ live_url: url.trim() })
      .eq('id', competitionId);

    if (error) throw new Error(error.message);

    revalidatePath(`/competitions/${competitionId}/live`);
    return { success: true, message: 'URL du direct mise à jour.' };
  } catch (error) {
    console.error('[UPDATE LIVE URL] ❌', error);
    return {
      success: false,
      error: userMessage(error, 'Erreur inconnue.'),
    };
  }
}

/**
 * Pourquoi l'accès est-il accordé ?
 *
 * Rendre la raison explicite évite une confusion coûteuse : un organisateur
 * qui teste ses propres événements y accède toujours, et pouvait croire qu'un
 * accès acheté valait pour tous les directs.
 */
export type LiveAccessReason = 'free' | 'purchased' | 'organizer' | 'admin' | 'none';

/**
 * L'utilisateur courant peut-il regarder ce direct ?
 *
 * Un direct gratuit est ouvert à tous ; un direct payant exige un accès acheté
 * **pour cet événement précis**. Un accès n'est jamais transversal.
 */
export async function checkLiveAccess(competitionId: string): Promise<{
  hasAccess: boolean;
  requiresLogin: boolean;
  price: number;
  reason: LiveAccessReason;
}> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('competitions')
    .select('id, organizer_id, live_paid, live_price')
    .eq('id', competitionId)
    .maybeSingle();

  if (!data) return { hasAccess: false, requiresLogin: false, price: 0, reason: 'none' };

  const competition = data as Pick<
    CompetitionRow,
    'id' | 'organizer_id' | 'live_paid' | 'live_price'
  >;
  const price = Number(competition.live_price);

  // Sans prix, la diffusion est en accès libre pour tout le monde.
  if (!competition.live_paid || price <= 0) {
    return { hasAccess: true, requiresLogin: false, price: 0, reason: 'free' };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { hasAccess: false, requiresLogin: true, price, reason: 'none' };
  }

  // L'organisateur accède à ses propres directs, l'administrateur à tous.
  if (competition.organizer_id === session.user.id) {
    return { hasAccess: true, requiresLogin: false, price, reason: 'organizer' };
  }
  if (session.user.role === 'admin') {
    return { hasAccess: true, requiresLogin: false, price, reason: 'admin' };
  }

  // L'accès acheté ne vaut que pour cet événement : les deux critères sont
  // exigés, et la contrainte `live_access_is_granted_once` interdit le doublon.
  const { data: access } = await supabase
    .from('live_access')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('competition_id', competitionId)
    .maybeSingle();

  return {
    hasAccess: !!access,
    requiresLogin: false,
    price,
    reason: access ? 'purchased' : 'none',
  };
}

/** Accès live achetés par l'utilisateur connecté. */
export async function getMyLiveAccess(): Promise<LiveAccess[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const { data, error } = await getSupabaseAdmin()
    .from('live_access')
    .select('*')
    .eq('user_id', session.user.id)
    .order('purchase_date', { ascending: false });

  if (error) {
    console.error('[GET MY LIVE ACCESS] ❌', error.message);
    return [];
  }

  return (data as LiveAccessRow[]).map(toLiveAccess);
}

/** Concours actuellement en direct, pour la mise en avant sur l'accueil. */
export async function getLiveNowCompetitions(): Promise<Competition[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('competitions')
    .select(COMPETITION_COLUMNS)
    .eq('live_is_live', true)
    .in('status', [...PUBLIC_COMPETITION_STATUSES]);

  if (error) {
    console.error('[GET LIVE NOW] ❌', error.message);
    return [];
  }

  return (data as unknown as CompetitionRow[]).map(toCompetition);
}
