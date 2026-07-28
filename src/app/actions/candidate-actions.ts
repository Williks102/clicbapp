'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import type { ActionResult, Candidate, Competition } from '@/lib/types';

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
    throw new Error('Vous devez être connecté.');
  }

  const doc = await firestore.collection('competitions').doc(competitionId).get();
  if (!doc.exists) {
    throw new Error('Concours introuvable.');
  }

  const competition = { id: doc.id, ...doc.data() } as Competition;
  if (competition.organizerId !== session.user.id && session.user.role !== 'admin') {
    throw new Error("Vous n'êtes pas autorisé à gérer ce concours.");
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

    // Un dossard ne peut pas être attribué deux fois dans le même concours.
    const duplicate = await firestore
      .collection('candidates')
      .where('competitionId', '==', competitionId)
      .where('number', '==', values.number)
      .limit(1)
      .get();

    if (!duplicate.empty) {
      return {
        success: false,
        error: `Le dossard n°${values.number} est déjà attribué.`,
      };
    }

    const candidate: Omit<Candidate, 'id'> = {
      competitionId,
      name: values.name,
      number: values.number,
      photo: values.photo || '',
      bio: values.bio || '',
      city: values.city || '',
      voteCount: 0,
      freeVoteCount: 0,
      paidVoteCount: 0,
      eliminated: false,
      createdAt: new Date().toISOString(),
    };

    const docRef = await firestore.collection('candidates').add(candidate);

    await firestore
      .collection('competitions')
      .doc(competitionId)
      .update({ 'stats.candidatesCount': FieldValue.increment(1) });

    revalidateCandidatePages(competitionId, docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[CREATE CANDIDATE] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

// ==================== UPDATE ====================

export async function updateCandidate(
  candidateId: string,
  data: CandidateFormValues
): Promise<ActionResult> {
  try {
    const candidateDoc = await firestore.collection('candidates').doc(candidateId).get();
    if (!candidateDoc.exists) {
      return { success: false, error: 'Candidat introuvable.' };
    }

    const candidate = candidateDoc.data() as Candidate;
    await requireCompetitionAccess(candidate.competitionId);

    const parsed = candidateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(', '),
      };
    }

    const values = parsed.data;

    if (values.number !== candidate.number) {
      const duplicate = await firestore
        .collection('candidates')
        .where('competitionId', '==', candidate.competitionId)
        .where('number', '==', values.number)
        .limit(1)
        .get();

      if (!duplicate.empty) {
        return {
          success: false,
          error: `Le dossard n°${values.number} est déjà attribué.`,
        };
      }
    }

    await firestore.collection('candidates').doc(candidateId).update({
      name: values.name,
      number: values.number,
      photo: values.photo || candidate.photo || '',
      bio: values.bio || '',
      city: values.city || '',
    });

    revalidateCandidatePages(candidate.competitionId, candidateId);
    return { success: true, message: 'Candidat mis à jour.' };
  } catch (error) {
    console.error('[UPDATE CANDIDATE] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

// ==================== ÉLIMINATION ====================

export async function setCandidateEliminated(
  candidateId: string,
  eliminated: boolean
): Promise<ActionResult> {
  try {
    const candidateDoc = await firestore.collection('candidates').doc(candidateId).get();
    if (!candidateDoc.exists) {
      return { success: false, error: 'Candidat introuvable.' };
    }

    const candidate = candidateDoc.data() as Candidate;
    await requireCompetitionAccess(candidate.competitionId);

    await firestore.collection('candidates').doc(candidateId).update({ eliminated });

    revalidateCandidatePages(candidate.competitionId, candidateId);
    return {
      success: true,
      message: eliminated ? 'Candidat éliminé.' : 'Candidat réintégré.',
    };
  } catch (error) {
    console.error('[SET CANDIDATE ELIMINATED] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

// ==================== DELETE ====================

export async function deleteCandidate(candidateId: string): Promise<ActionResult> {
  try {
    const candidateDoc = await firestore.collection('candidates').doc(candidateId).get();
    if (!candidateDoc.exists) {
      return { success: false, error: 'Candidat introuvable.' };
    }

    const candidate = candidateDoc.data() as Candidate;
    const { competition } = await requireCompetitionAccess(candidate.competitionId);

    if (candidate.paidVoteCount > 0) {
      return {
        success: false,
        error:
          'Ce candidat a reçu des votes payants : éliminez-le plutôt que de le supprimer.',
      };
    }

    await firestore.collection('candidates').doc(candidateId).delete();
    await firestore
      .collection('competitions')
      .doc(competition.id)
      .update({ 'stats.candidatesCount': FieldValue.increment(-1) });

    revalidateCandidatePages(candidate.competitionId);
    return { success: true, message: 'Candidat supprimé.' };
  } catch (error) {
    console.error('[DELETE CANDIDATE] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

// ==================== LECTURE ====================

export async function getCandidate(candidateId: string): Promise<Candidate | null> {
  const doc = await firestore.collection('candidates').doc(candidateId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Candidate;
}
