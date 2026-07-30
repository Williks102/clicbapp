'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
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
    throw new Error('Vous devez être connecté.');
  }

  const { data, error } = await getSupabaseAdmin()
    .from('competitions')
    .select('id, organizer_id, live_enabled, live_url, live_provider')
    .eq('id', competitionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Concours introuvable.');

  const competition = data as Pick<
    CompetitionRow,
    'id' | 'organizer_id' | 'live_enabled' | 'live_url' | 'live_provider'
  >;

  if (competition.organizer_id !== session.user.id && session.user.role !== 'admin') {
    throw new Error("Vous n'êtes pas autorisé à piloter ce direct.");
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
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
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
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

/**
 * L'utilisateur courant peut-il regarder le direct ?
 * Un direct gratuit est ouvert à tous ; un direct payant exige un accès acheté.
 */
export async function checkLiveAccess(competitionId: string): Promise<{
  hasAccess: boolean;
  requiresLogin: boolean;
  price: number;
}> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('competitions')
    .select('id, organizer_id, live_paid, live_price')
    .eq('id', competitionId)
    .maybeSingle();

  if (!data) return { hasAccess: false, requiresLogin: false, price: 0 };

  const competition = data as Pick<
    CompetitionRow,
    'id' | 'organizer_id' | 'live_paid' | 'live_price'
  >;
  const price = Number(competition.live_price);

  if (!competition.live_paid || price <= 0) {
    return { hasAccess: true, requiresLogin: false, price: 0 };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { hasAccess: false, requiresLogin: true, price };
  }

  // L'organisateur et les administrateurs accèdent toujours à la diffusion.
  if (competition.organizer_id === session.user.id || session.user.role === 'admin') {
    return { hasAccess: true, requiresLogin: false, price };
  }

  const { data: access } = await supabase
    .from('live_access')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('competition_id', competitionId)
    .maybeSingle();

  return { hasAccess: !!access, requiresLogin: false, price };
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
