'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { checkLiveUrl } from '@/lib/live-url';
import { toCandidate, toCompetition } from '@/lib/supabase/mappers';
import {
  COMPETITION_COLUMNS,
  type CandidateRow,
  type CompetitionRow,
} from '@/lib/supabase/types';
import { PUBLIC_COMPETITION_STATUSES } from '@/lib/live-utils';
import type { ActionResult, Candidate, Competition, CompetitionStatus } from '@/lib/types';

// ==================== SCHEMAS ====================

const votePackSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Le nom du pack est requis.'),
  votes: z.coerce.number().int().min(1, 'Un pack doit contenir au moins 1 vote.'),
  price: z.coerce.number().min(1, 'Le prix doit être supérieur à 0.'),
  highlighted: z.boolean().optional(),
});

const competitionSchema = z
  .object({
    title: z.string().min(3, 'Le titre du concours est requis.'),
    category: z.string().min(1, 'La catégorie est requise.'),
    description: z.string().min(10, 'La description est trop courte.'),
    coverImage: z.string().optional(),
    votingEnabled: z.boolean().default(true),
    votingStartsAt: z.string().default(''),
    votingEndsAt: z.string().default(''),
    status: z
      .enum(['draft', 'published', 'voting', 'closed', 'finished'])
      .default('draft'),
    hideResults: z.boolean().default(false),
    votePacks: z.array(votePackSchema).default([]),
    freeVoteEnabled: z.boolean().default(true),
    freeVoteCooldownHours: z.coerce.number().int().min(1).max(720).default(24),
    liveEnabled: z.boolean().default(false),
    liveTitle: z.string().optional(),
    liveProvider: z
      .enum(['youtube', 'facebook', 'vimeo', 'tiktok', 'hls', 'iframe'])
      .default('youtube'),
    liveUrl: z.string().optional(),
    liveScheduledAt: z.string().optional(),
    livePaid: z.boolean().default(false),
    livePrice: z.coerce.number().min(0).default(0),
    liveChatEnabled: z.boolean().default(true),
    liveReplayUrl: z.string().optional(),
  })
  /*
   * Le vote est facultatif : un événement peut se limiter à une diffusion.
   * Ces règles ne s'appliquent donc qu'aux événements qui organisent un
   * scrutin.
   */
  .superRefine((data, ctx) => {
    if (!data.votingEnabled) return;

    if (!data.votingStartsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date d'ouverture des votes est requise.",
        path: ['votingStartsAt'],
      });
    }
    if (!data.votingEndsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La date de clôture des votes est requise.',
        path: ['votingEndsAt'],
      });
    }
    if (
      data.votingStartsAt &&
      data.votingEndsAt &&
      new Date(data.votingEndsAt).getTime() <= new Date(data.votingStartsAt).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La clôture des votes doit être postérieure à leur ouverture.',
        path: ['votingEndsAt'],
      });
    }
    if (data.votePacks.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Au moins un pack de votes est requis.',
        path: ['votePacks'],
      });
    }
  })
  // Un événement sans vote ni diffusion n'aurait aucun contenu.
  .refine((data) => data.votingEnabled || data.liveEnabled, {
    message: 'Activez au moins le vote ou la diffusion en direct.',
    path: ['liveEnabled'],
  })
  .refine((data) => !data.liveEnabled || !!data.liveTitle, {
    message: 'Le titre du direct est requis lorsque la diffusion est activée.',
    path: ['liveTitle'],
  })
  .refine((data) => !data.liveEnabled || !data.livePaid || data.livePrice > 0, {
    message: "Le prix d'accès au direct doit être supérieur à 0.",
    path: ['livePrice'],
  })
  /*
   * Les deux adresses finissent dans le `src` d'une iframe : le direct quand
   * l'antenne est ouverte, la rediffusion ensuite (`live-player.tsx`). Elles
   * subissent donc le même contrôle.
   */
  .superRefine((data, ctx) => {
    for (const field of ['liveUrl', 'liveReplayUrl'] as const) {
      const check = checkLiveUrl(data.liveProvider, data[field] ?? '');
      if (!check.ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: check.error, path: [field] });
      }
    }
  });

export type CompetitionFormValues = z.input<typeof competitionSchema>;

// ==================== HELPERS ====================

async function requireOrganizer() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Vous devez être connecté.');
  }
  if (session.user.role !== 'organizer' && session.user.role !== 'admin') {
    throw new Error('Seuls les organisateurs peuvent gérer des concours.');
  }
  return session.user;
}

async function requireCompetitionAccess(competitionId: string) {
  const user = await requireOrganizer();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('competitions')
    .select('id, organizer_id, live_is_live, cover_image')
    .eq('id', competitionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Concours introuvable.');

  const competition = data as Pick<
    CompetitionRow,
    'id' | 'organizer_id' | 'live_is_live' | 'cover_image'
  >;

  if (competition.organizer_id !== user.id && user.role !== 'admin') {
    throw new Error("Vous n'êtes pas autorisé à modifier ce concours.");
  }

  return { user, competition };
}

/** Colonnes du concours dérivées du formulaire, hors packs. */
function toCompetitionColumns(values: z.infer<typeof competitionSchema>) {
  return {
    title: values.title,
    category: values.category,
    description: values.description,
    status: values.status,
    voting_enabled: values.votingEnabled,
    voting_starts_at: values.votingEnabled
      ? new Date(values.votingStartsAt).toISOString()
      : null,
    voting_ends_at: values.votingEnabled
      ? new Date(values.votingEndsAt).toISOString()
      : null,
    hide_results: values.hideResults,
    free_vote_enabled: values.freeVoteEnabled,
    free_vote_cooldown_hours: values.freeVoteCooldownHours,
    live_enabled: values.liveEnabled,
    live_title: values.liveTitle || '',
    live_provider: values.liveProvider,
    live_url: values.liveUrl || '',
    live_scheduled_at: values.liveScheduledAt
      ? new Date(values.liveScheduledAt).toISOString()
      : null,
    live_paid: values.livePaid,
    live_price: values.livePaid ? values.livePrice : 0,
    live_chat_enabled: values.liveChatEnabled,
    live_replay_url: values.liveReplayUrl || '',
  };
}

function revalidateCompetition(competitionId: string) {
  revalidatePath('/');
  revalidatePath('/competitions');
  revalidatePath(`/competitions/${competitionId}`);
  revalidatePath(`/competitions/${competitionId}/live`);
  revalidatePath('/dashboard/competitions');
  revalidatePath(`/dashboard/competitions/${competitionId}`);
}

// ==================== CREATE ====================

export async function createCompetition(
  data: CompetitionFormValues
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const user = await requireOrganizer();

    const parsed = competitionSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(', '),
      };
    }

    const values = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data: created, error } = await supabase
      .from('competitions')
      .insert({
        ...toCompetitionColumns(values),
        organizer_id: user.id,
        organizer_name: user.name || '',
        cover_image: values.coverImage || '',
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    const competitionId = (created as { id: string }).id;

    const { error: packError } = await supabase.rpc('replace_vote_packs', {
      p_competition_id: competitionId,
      p_packs: values.votePacks.map((pack) => ({
        id: pack.id ?? '',
        name: pack.name,
        votes: pack.votes,
        price: pack.price,
        highlighted: pack.highlighted ?? false,
      })),
    });

    if (packError) throw new Error(packError.message);

    revalidateCompetition(competitionId);
    return { success: true, id: competitionId };
  } catch (error) {
    console.error('[CREATE COMPETITION] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

// ==================== UPDATE ====================

export async function updateCompetition(
  competitionId: string,
  data: CompetitionFormValues
): Promise<ActionResult> {
  try {
    const { competition } = await requireCompetitionAccess(competitionId);

    const parsed = competitionSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(', '),
      };
    }

    const values = parsed.data;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('competitions')
      .update({
        ...toCompetitionColumns(values),
        cover_image: values.coverImage || competition.cover_image || '',
      })
      .eq('id', competitionId);

    if (error) throw new Error(error.message);

    const { error: packError } = await supabase.rpc('replace_vote_packs', {
      p_competition_id: competitionId,
      p_packs: values.votePacks.map((pack) => ({
        id: pack.id ?? '',
        name: pack.name,
        votes: pack.votes,
        price: pack.price,
        highlighted: pack.highlighted ?? false,
      })),
    });

    if (packError) throw new Error(packError.message);

    revalidateCompetition(competitionId);
    return { success: true, message: 'Concours mis à jour.' };
  } catch (error) {
    console.error('[UPDATE COMPETITION] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

// ==================== STATUS ====================

export async function setCompetitionStatus(
  competitionId: string,
  status: CompetitionStatus
): Promise<ActionResult> {
  try {
    await requireCompetitionAccess(competitionId);

    const { error } = await getSupabaseAdmin()
      .from('competitions')
      .update({ status })
      .eq('id', competitionId);

    if (error) throw new Error(error.message);

    revalidateCompetition(competitionId);
    return { success: true, message: 'Statut du concours mis à jour.' };
  } catch (error) {
    console.error('[SET COMPETITION STATUS] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

export async function declareWinner(
  competitionId: string,
  candidateId: string
): Promise<ActionResult> {
  try {
    await requireCompetitionAccess(competitionId);
    const supabase = getSupabaseAdmin();

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, competition_id')
      .eq('id', candidateId)
      .maybeSingle();

    if (!candidate || (candidate as CandidateRow).competition_id !== competitionId) {
      return { success: false, error: 'Candidat introuvable pour ce concours.' };
    }

    const { error } = await supabase
      .from('competitions')
      .update({
        winner_candidate_id: candidateId,
        status: 'finished',
        hide_results: false,
        live_is_live: false,
      })
      .eq('id', competitionId);

    if (error) throw new Error(error.message);

    revalidateCompetition(competitionId);
    return { success: true, message: 'Vainqueur publié.' };
  } catch (error) {
    console.error('[DECLARE WINNER] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

// ==================== DELETE ====================

export async function deleteCompetition(competitionId: string): Promise<ActionResult> {
  try {
    await requireCompetitionAccess(competitionId);

    // Les candidats, packs et messages sont supprimés en cascade par la base ;
    // les commandes et votes conservent leur historique comptable.
    const { error } = await getSupabaseAdmin()
      .from('competitions')
      .delete()
      .eq('id', competitionId);

    if (error) throw new Error(error.message);

    revalidateCompetition(competitionId);
    revalidatePath('/admin/competitions');
    return { success: true, message: 'Concours supprimé.' };
  } catch (error) {
    console.error('[DELETE COMPETITION] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

// ==================== LECTURE ====================

/**
 * Concours par identifiant.
 *
 * Un brouillon n'est renvoyé qu'à son organisateur ou à un administrateur :
 * cette fonction étant une Server Action, elle est appelable directement depuis
 * le navigateur et ne doit pas divulguer les concours non publiés.
 */
export async function getCompetition(competitionId: string): Promise<Competition | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('competitions')
    .select(COMPETITION_COLUMNS)
    .eq('id', competitionId)
    .maybeSingle();

  if (error) {
    console.error('[GET COMPETITION] ❌', error.message);
    return null;
  }

  if (!data) return null;

  const competition = toCompetition(data as unknown as CompetitionRow);
  if (competition.status !== 'draft') return competition;

  const session = await auth();
  const canSeeDraft =
    session?.user?.id === competition.organizerId || session?.user?.role === 'admin';

  return canSeeDraft ? competition : null;
}

/** Concours accessible en écriture par l'utilisateur courant. */
export async function getOwnedCompetition(
  competitionId: string
): Promise<Competition | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const competition = await getCompetition(competitionId);
  if (!competition) return null;

  if (competition.organizerId !== session.user.id && session.user.role !== 'admin') {
    return null;
  }

  return competition;
}

export async function getCandidatesForCompetition(
  competitionId: string
): Promise<Candidate[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('candidates')
    .select('*')
    .eq('competition_id', competitionId)
    .order('vote_count', { ascending: false })
    .order('number', { ascending: true });

  if (error) {
    console.error('[GET CANDIDATES] ❌', error.message);
    return [];
  }

  return (data as CandidateRow[]).map(toCandidate);
}

export async function getCompetitionsForOrganizer(
  organizerId?: string
): Promise<Competition[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const targetId = organizerId || session.user.id;
  if (session.user.role !== 'admin' && targetId !== session.user.id) return [];

  let request = getSupabaseAdmin()
    .from('competitions')
    .select(COMPETITION_COLUMNS)
    .order('created_at', { ascending: false });

  // L'admin sans filtre explicite voit l'ensemble des concours.
  if (session.user.role !== 'admin' || organizerId) {
    request = request.eq('organizer_id', targetId);
  }

  const { data, error } = await request;

  if (error) {
    console.error('[GET ORGANIZER COMPETITIONS] ❌', error.message);
    return [];
  }

  return (data as unknown as CompetitionRow[]).map(toCompetition);
}

/**
 * Catalogue des concours.
 *
 * Les événements de diffusion pure en sont exclus : ils n'ont ni candidats ni
 * classement, et les proposer ici inviterait à voter là où il n'y a rien à
 * voter. Ils sont listés sur la page des diffusions.
 */
export async function getPublicCompetitions(): Promise<Competition[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('competitions')
    .select(COMPETITION_COLUMNS)
    .eq('voting_enabled', true)
    .in('status', [...PUBLIC_COMPETITION_STATUSES])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET PUBLIC COMPETITIONS] ❌', error.message);
    return [];
  }

  return (data as unknown as CompetitionRow[]).map(toCompetition);
}
