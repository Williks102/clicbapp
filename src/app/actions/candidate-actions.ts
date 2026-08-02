'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { UserFacingError, userMessage } from '@/lib/errors';
import { toCandidate } from '@/lib/supabase/mappers';
import type { CandidateRow, CompetitionRow } from '@/lib/supabase/types';
import type { ActionResult, Candidate } from '@/lib/types';

const candidateSchema = z.object({
  name: z.string().min(2, 'Le nom du candidat est requis.'),
  number: z.coerce.number().int().min(1, 'Le numéro de dossard doit être supérieur à 0.'),
  photo: z.string().optional(),
  bio: z.string().max(1000, 'La biographie est trop longue.').optional(),
  city: z.string().optional(),
});

export type CandidateFormValues = z.input<typeof candidateSchema>;

async function requireCompetitionAccess(competitionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UserFacingError('Vous devez être connecté.');
  }

  const { data, error } = await getSupabaseAdmin()
    .from('competitions')
    .select('id, organizer_id')
    .eq('id', competitionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new UserFacingError('Concours introuvable.');

  const competition = data as Pick<CompetitionRow, 'id' | 'organizer_id'>;
  if (competition.organizer_id !== session.user.id && session.user.role !== 'admin') {
    throw new UserFacingError("Vous n'êtes pas autorisé à gérer ce concours.");
  }

  return { user: session.user, competition };
}

function revalidateCandidatePages(competitionId: string, candidateId?: string) {
  revalidatePath(`/competitions/${competitionId}`);
  revalidatePath(`/competitions/${competitionId}/live`);
  revalidatePath(`/dashboard/competitions/${competitionId}/candidates`);
  if (candidateId) {
    revalidatePath(`/competitions/${competitionId}/candidates/${candidateId}`);
  }
}

/** 23505 : violation d'unicité — ici, le dossard déjà attribué. */
function isDuplicateNumber(code?: string) {
  return code === '23505';
}

// ==================== CREATE ====================

export async function createCandidate(
  competitionId: string,
  data: CandidateFormValues
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    await requireCompetitionAccess(competitionId);

    const parsed = candidateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(', '),
      };
    }

    const values = parsed.data;

    // L'unicité du dossard est garantie par une contrainte : plus besoin de
    // vérifier avant d'écrire, et deux créations simultanées ne peuvent plus
    // aboutir au même numéro.
    const { data: created, error } = await getSupabaseAdmin()
      .from('candidates')
      .insert({
        competition_id: competitionId,
        name: values.name,
        number: values.number,
        photo: values.photo || '',
        bio: values.bio || '',
        city: values.city || '',
      })
      .select('id')
      .single();

    if (error) {
      if (isDuplicateNumber(error.code)) {
        return { success: false, error: `Le dossard n°${values.number} est déjà attribué.` };
      }
      throw new Error(error.message);
    }

    const candidateId = (created as { id: string }).id;
    revalidateCandidatePages(competitionId, candidateId);
    return { success: true, id: candidateId };
  } catch (error) {
    console.error('[CREATE CANDIDATE] ❌', error);
    return {
      success: false,
      error: userMessage(error, 'Erreur inconnue.'),
    };
  }
}

// ==================== UPDATE ====================

export async function updateCandidate(
  candidateId: string,
  data: CandidateFormValues
): Promise<ActionResult> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: existing, error: readError } = await supabase
      .from('candidates')
      .select('id, competition_id, photo')
      .eq('id', candidateId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!existing) return { success: false, error: 'Candidat introuvable.' };

    const candidate = existing as Pick<CandidateRow, 'id' | 'competition_id' | 'photo'>;
    await requireCompetitionAccess(candidate.competition_id);

    const parsed = candidateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(', '),
      };
    }

    const values = parsed.data;

    const { error } = await supabase
      .from('candidates')
      .update({
        name: values.name,
        number: values.number,
        photo: values.photo || candidate.photo || '',
        bio: values.bio || '',
        city: values.city || '',
      })
      .eq('id', candidateId);

    if (error) {
      if (isDuplicateNumber(error.code)) {
        return { success: false, error: `Le dossard n°${values.number} est déjà attribué.` };
      }
      throw new Error(error.message);
    }

    revalidateCandidatePages(candidate.competition_id, candidateId);
    return { success: true, message: 'Candidat mis à jour.' };
  } catch (error) {
    console.error('[UPDATE CANDIDATE] ❌', error);
    return {
      success: false,
      error: userMessage(error, 'Erreur inconnue.'),
    };
  }
}

// ==================== ÉLIMINATION ====================

export async function setCandidateEliminated(
  candidateId: string,
  eliminated: boolean
): Promise<ActionResult> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('candidates')
      .select('id, competition_id')
      .eq('id', candidateId)
      .maybeSingle();

    if (!existing) return { success: false, error: 'Candidat introuvable.' };

    const candidate = existing as Pick<CandidateRow, 'id' | 'competition_id'>;
    await requireCompetitionAccess(candidate.competition_id);

    const { error } = await supabase
      .from('candidates')
      .update({ eliminated })
      .eq('id', candidateId);

    if (error) throw new Error(error.message);

    revalidateCandidatePages(candidate.competition_id, candidateId);
    return {
      success: true,
      message: eliminated ? 'Candidat éliminé.' : 'Candidat réintégré.',
    };
  } catch (error) {
    console.error('[SET CANDIDATE ELIMINATED] ❌', error);
    return {
      success: false,
      error: userMessage(error, 'Erreur inconnue.'),
    };
  }
}

// ==================== DELETE ====================

export async function deleteCandidate(candidateId: string): Promise<ActionResult> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('candidates')
      .select('id, competition_id, paid_vote_count')
      .eq('id', candidateId)
      .maybeSingle();

    if (!existing) return { success: false, error: 'Candidat introuvable.' };

    const candidate = existing as Pick<
      CandidateRow,
      'id' | 'competition_id' | 'paid_vote_count'
    >;
    await requireCompetitionAccess(candidate.competition_id);

    if (candidate.paid_vote_count > 0) {
      return {
        success: false,
        error:
          'Ce candidat a reçu des votes payants : éliminez-le plutôt que de le supprimer.',
      };
    }

    const { error } = await supabase.from('candidates').delete().eq('id', candidateId);
    if (error) throw new Error(error.message);

    revalidateCandidatePages(candidate.competition_id);
    return { success: true, message: 'Candidat supprimé.' };
  } catch (error) {
    console.error('[DELETE CANDIDATE] ❌', error);
    return {
      success: false,
      error: userMessage(error, 'Erreur inconnue.'),
    };
  }
}

// ==================== LECTURE ====================

export async function getCandidate(candidateId: string): Promise<Candidate | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .maybeSingle();

  if (error) {
    console.error('[GET CANDIDATE] ❌', error.message);
    return null;
  }

  return data ? toCandidate(data as CandidateRow) : null;
}
