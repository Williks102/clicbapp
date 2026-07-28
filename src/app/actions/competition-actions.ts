'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type {
  ActionResult,
  Candidate,
  Competition,
  CompetitionStatus,
  VotePack,
} from '@/lib/types';

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
    votingStartsAt: z.string().min(1, "La date d'ouverture des votes est requise."),
    votingEndsAt: z.string().min(1, 'La date de clôture des votes est requise.'),
    status: z
      .enum(['draft', 'published', 'voting', 'closed', 'finished'])
      .default('draft'),
    hideResults: z.boolean().default(false),
    votePacks: z.array(votePackSchema).min(1, 'Au moins un pack de votes est requis.'),
    freeVoteEnabled: z.boolean().default(true),
    freeVoteCooldownHours: z.coerce.number().int().min(1).max(720).default(24),
    liveEnabled: z.boolean().default(false),
    liveTitle: z.string().optional(),
    liveProvider: z
      .enum(['youtube', 'facebook', 'vimeo', 'hls', 'iframe'])
      .default('youtube'),
    liveUrl: z.string().optional(),
    liveScheduledAt: z.string().optional(),
    livePaid: z.boolean().default(false),
    livePrice: z.coerce.number().min(0).default(0),
    liveChatEnabled: z.boolean().default(true),
    liveReplayUrl: z.string().optional(),
  })
  .refine(
    (data) => new Date(data.votingEndsAt).getTime() > new Date(data.votingStartsAt).getTime(),
    {
      message: 'La clôture des votes doit être postérieure à leur ouverture.',
      path: ['votingEndsAt'],
    }
  )
  .refine((data) => !data.liveEnabled || !!data.liveTitle, {
    message: 'Le titre du direct est requis lorsque la diffusion est activée.',
    path: ['liveTitle'],
  })
  .refine((data) => !data.liveEnabled || !data.livePaid || data.livePrice > 0, {
    message: "Le prix d'accès au direct doit être supérieur à 0.",
    path: ['livePrice'],
  });

export type CompetitionFormValues = z.input<typeof competitionSchema>;

// ==================== HELPERS ====================

async function requireOrganizer() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Vous devez être connecté.');
  }
  if (session.user.role !== 'organizer' && session.user.role !== 'admin') {
    throw new Error("Seuls les organisateurs peuvent gérer des concours.");
  }
  return session.user;
}

/** Vérifie que l'utilisateur peut modifier ce concours (propriétaire ou admin). */
async function requireCompetitionAccess(competitionId: string) {
  const user = await requireOrganizer();
  const doc = await firestore.collection('competitions').doc(competitionId).get();

  if (!doc.exists) {
    throw new Error('Concours introuvable.');
  }

  const competition = { id: doc.id, ...doc.data() } as Competition;
  if (competition.organizerId !== user.id && user.role !== 'admin') {
    throw new Error("Vous n'êtes pas autorisé à modifier ce concours.");
  }

  return { user, competition };
}

function buildVotePacks(packs: z.infer<typeof votePackSchema>[]): VotePack[] {
  return packs.map((pack, index) => ({
    id: pack.id || `pack-${Date.now()}-${index}`,
    name: pack.name,
    votes: pack.votes,
    price: pack.price,
    highlighted: pack.highlighted ?? false,
  }));
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
    const now = new Date().toISOString();

    const competition: Omit<Competition, 'id'> = {
      title: values.title,
      category: values.category,
      description: values.description,
      coverImage: values.coverImage || '',
      organizerId: user.id,
      organizerName: user.name || '',
      status: values.status,
      votingStartsAt: new Date(values.votingStartsAt).toISOString(),
      votingEndsAt: new Date(values.votingEndsAt).toISOString(),
      votePacks: buildVotePacks(values.votePacks),
      freeVote: {
        enabled: values.freeVoteEnabled,
        cooldownHours: values.freeVoteCooldownHours,
      },
      live: {
        enabled: values.liveEnabled,
        title: values.liveTitle || '',
        provider: values.liveProvider,
        url: values.liveUrl || '',
        isLive: false,
        scheduledAt: values.liveScheduledAt
          ? new Date(values.liveScheduledAt).toISOString()
          : '',
        paid: values.livePaid,
        price: values.livePaid ? values.livePrice : 0,
        chatEnabled: values.liveChatEnabled,
        replayUrl: values.liveReplayUrl || '',
      },
      stats: {
        totalVotes: 0,
        freeVotes: 0,
        paidVotes: 0,
        totalRevenue: 0,
        candidatesCount: 0,
      },
      hideResults: values.hideResults,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await firestore.collection('competitions').add(competition);
    revalidateCompetition(docRef.id);

    return { success: true, id: docRef.id };
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

    await firestore
      .collection('competitions')
      .doc(competitionId)
      .update({
        title: values.title,
        category: values.category,
        description: values.description,
        coverImage: values.coverImage || competition.coverImage || '',
        status: values.status,
        votingStartsAt: new Date(values.votingStartsAt).toISOString(),
        votingEndsAt: new Date(values.votingEndsAt).toISOString(),
        votePacks: buildVotePacks(values.votePacks),
        freeVote: {
          enabled: values.freeVoteEnabled,
          cooldownHours: values.freeVoteCooldownHours,
        },
        live: {
          enabled: values.liveEnabled,
          title: values.liveTitle || '',
          provider: values.liveProvider,
          url: values.liveUrl || '',
          // Le statut "en direct" se pilote uniquement depuis la régie.
          isLive: competition.live?.isLive ?? false,
          scheduledAt: values.liveScheduledAt
            ? new Date(values.liveScheduledAt).toISOString()
            : '',
          paid: values.livePaid,
          price: values.livePaid ? values.livePrice : 0,
          chatEnabled: values.liveChatEnabled,
          replayUrl: values.liveReplayUrl || '',
        },
        hideResults: values.hideResults,
        updatedAt: new Date().toISOString(),
      });

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

    await firestore.collection('competitions').doc(competitionId).update({
      status,
      updatedAt: new Date().toISOString(),
    });

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

/** Publie le vainqueur et clôture définitivement le concours. */
export async function declareWinner(
  competitionId: string,
  candidateId: string
): Promise<ActionResult> {
  try {
    await requireCompetitionAccess(competitionId);

    const candidateDoc = await firestore.collection('candidates').doc(candidateId).get();
    if (!candidateDoc.exists || candidateDoc.data()?.competitionId !== competitionId) {
      return { success: false, error: 'Candidat introuvable pour ce concours.' };
    }

    await firestore.collection('competitions').doc(competitionId).update({
      winnerCandidateId: candidateId,
      status: 'finished',
      hideResults: false,
      'live.isLive': false,
      updatedAt: new Date().toISOString(),
    });

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

    const batch = firestore.batch();

    // Les candidats du concours n'ont plus de raison d'exister.
    const candidates = await firestore
      .collection('candidates')
      .where('competitionId', '==', competitionId)
      .get();
    candidates.docs.forEach((doc) => batch.delete(doc.ref));

    // Le chat live également.
    const messages = await firestore
      .collection('chatMessages')
      .where('competitionId', '==', competitionId)
      .get();
    messages.docs.forEach((doc) => batch.delete(doc.ref));

    batch.delete(firestore.collection('competitions').doc(competitionId));
    await batch.commit();

    // Les votes et commandes sont conservés pour la traçabilité comptable.
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

export async function getCompetition(competitionId: string): Promise<Competition | null> {
  const doc = await firestore.collection('competitions').doc(competitionId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Competition;
}

/**
 * Concours accessible en écriture par l'utilisateur courant.
 * Retourne `null` si le concours n'existe pas ou ne lui appartient pas.
 */
export async function getOwnedCompetition(
  competitionId: string
): Promise<Competition | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const doc = await firestore.collection('competitions').doc(competitionId).get();
  if (!doc.exists) return null;

  const competition = { id: doc.id, ...doc.data() } as Competition;
  if (competition.organizerId !== session.user.id && session.user.role !== 'admin') {
    return null;
  }

  return competition;
}

export async function getCandidatesForCompetition(
  competitionId: string
): Promise<Candidate[]> {
  const snapshot = await firestore
    .collection('candidates')
    .where('competitionId', '==', competitionId)
    .get();

  const candidates = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Candidate
  );

  // Tri applicatif : évite d'imposer un index composite supplémentaire.
  return candidates.sort((a, b) => b.voteCount - a.voteCount || a.number - b.number);
}

/** Concours d'un organisateur (ou tous, pour l'admin). */
export async function getCompetitionsForOrganizer(
  organizerId?: string
): Promise<Competition[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const targetId = organizerId || session.user.id;
  if (session.user.role !== 'admin' && targetId !== session.user.id) return [];

  const query =
    session.user.role === 'admin' && !organizerId
      ? firestore.collection('competitions')
      : firestore.collection('competitions').where('organizerId', '==', targetId);

  const snapshot = await query.get();
  const competitions = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Competition
  );

  return competitions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Concours visibles publiquement. */
export async function getPublicCompetitions(): Promise<Competition[]> {
  const snapshot = await firestore
    .collection('competitions')
    .where('status', 'in', ['published', 'voting', 'closed', 'finished'])
    .get();

  const competitions = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Competition
  );

  return competitions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
