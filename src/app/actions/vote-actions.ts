'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { isVotingOpen } from '@/lib/live-utils';
import type {
  Candidate,
  Competition,
  FreeVoteClaim,
  Vote,
  VoteResult,
} from '@/lib/types';

/** Identifiant déterministe du suivi de vote gratuit. */
function freeVoteClaimId(userId: string, competitionId: string) {
  return `${userId}_${competitionId}`;
}

/**
 * État du vote gratuit pour l'utilisateur courant sur un concours :
 * permet d'afficher le bouton actif ou le compte à rebours.
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

  const competitionDoc = await firestore
    .collection('competitions')
    .doc(competitionId)
    .get();

  if (!competitionDoc.exists) return { available: false, requiresLogin: false };

  const competition = { id: competitionDoc.id, ...competitionDoc.data() } as Competition;
  if (!competition.freeVote?.enabled || !isVotingOpen(competition)) {
    return { available: false, requiresLogin: false };
  }

  const claimDoc = await firestore
    .collection('freeVoteClaims')
    .doc(freeVoteClaimId(session.user.id, competitionId))
    .get();

  if (!claimDoc.exists) return { available: true, requiresLogin: false };

  const claim = claimDoc.data() as FreeVoteClaim;
  const nextAt =
    new Date(claim.lastVotedAt).getTime() +
    competition.freeVote.cooldownHours * 60 * 60 * 1000;

  if (Date.now() >= nextAt) return { available: true, requiresLogin: false };

  return {
    available: false,
    requiresLogin: false,
    nextFreeVoteAt: new Date(nextAt).toISOString(),
  };
}

/**
 * Enregistre le vote gratuit d'un utilisateur connecté.
 * Le cooldown est appliqué de façon atomique pour empêcher le vote en rafale.
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

    const userId = session.user.id;
    const competitionRef = firestore.collection('competitions').doc(competitionId);
    const candidateRef = firestore.collection('candidates').doc(candidateId);
    const claimRef = firestore
      .collection('freeVoteClaims')
      .doc(freeVoteClaimId(userId, competitionId));
    const voteRef = firestore.collection('votes').doc();

    const result = await firestore.runTransaction(async (transaction) => {
      const [competitionDoc, candidateDoc, claimDoc] = await Promise.all([
        transaction.get(competitionRef),
        transaction.get(candidateRef),
        transaction.get(claimRef),
      ]);

      if (!competitionDoc.exists) throw new Error('Concours introuvable.');
      if (!candidateDoc.exists) throw new Error('Candidat introuvable.');

      const competition = {
        id: competitionDoc.id,
        ...competitionDoc.data(),
      } as Competition;
      const candidate = { id: candidateDoc.id, ...candidateDoc.data() } as Candidate;

      if (candidate.competitionId !== competitionId) {
        throw new Error("Ce candidat ne participe pas à ce concours.");
      }
      if (candidate.eliminated) {
        throw new Error('Ce candidat est éliminé, vous ne pouvez plus voter pour lui.');
      }
      if (!competition.freeVote?.enabled) {
        throw new Error("Le vote gratuit n'est pas activé pour ce concours.");
      }
      if (!isVotingOpen(competition)) {
        throw new Error('Les votes ne sont pas ouverts pour ce concours.');
      }

      const cooldownMs = competition.freeVote.cooldownHours * 60 * 60 * 1000;

      if (claimDoc.exists) {
        const claim = claimDoc.data() as FreeVoteClaim;
        const nextAt = new Date(claim.lastVotedAt).getTime() + cooldownMs;
        if (Date.now() < nextAt) {
          throw new Error(
            `Vous avez déjà utilisé votre vote gratuit. Prochain vote possible le ${new Date(
              nextAt
            ).toLocaleString('fr-FR')}.`
          );
        }
      }

      const now = new Date().toISOString();

      const vote: Omit<Vote, 'id'> = {
        competitionId,
        candidateId,
        candidateName: candidate.name,
        userId,
        voterEmail: session.user.email || '',
        voterName: session.user.name || '',
        quantity: 1,
        type: 'free',
        createdAt: now,
      };

      transaction.set(voteRef, vote);
      transaction.update(candidateRef, {
        voteCount: FieldValue.increment(1),
        freeVoteCount: FieldValue.increment(1),
      });
      transaction.update(competitionRef, {
        'stats.totalVotes': FieldValue.increment(1),
        'stats.freeVotes': FieldValue.increment(1),
      });
      transaction.set(
        claimRef,
        {
          userId,
          competitionId,
          lastVotedAt: now,
          totalFreeVotes: FieldValue.increment(1),
        },
        { merge: true }
      );

      return {
        newVoteCount: candidate.voteCount + 1,
        nextFreeVoteAt: new Date(Date.now() + cooldownMs).toISOString(),
      };
    });

    revalidatePath(`/competitions/${competitionId}`);
    revalidatePath(`/competitions/${competitionId}/candidates/${candidateId}`);

    return {
      success: true,
      message: 'Votre vote gratuit a bien été pris en compte !',
      newVoteCount: result.newVoteCount,
      nextFreeVoteAt: result.nextFreeVoteAt,
    };
  } catch (error) {
    console.error('[CAST FREE VOTE] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

/**
 * Crédite les votes d'une commande payée.
 * Appelée par le webhook de paiement, à l'intérieur d'une transaction Firestore.
 */
export async function applyPaidVotes(params: {
  competitionId: string;
  candidateId: string;
  candidateName: string;
  quantity: number;
  orderId: string;
  amount: number;
  userId?: string;
  voterEmail?: string;
  voterName?: string;
}): Promise<void> {
  const competitionRef = firestore.collection('competitions').doc(params.competitionId);
  const candidateRef = firestore.collection('candidates').doc(params.candidateId);
  const voteRef = firestore.collection('votes').doc(params.orderId);

  await firestore.runTransaction(async (transaction) => {
    const [competitionDoc, candidateDoc, existingVote] = await Promise.all([
      transaction.get(competitionRef),
      transaction.get(candidateRef),
      transaction.get(voteRef),
    ]);

    if (!competitionDoc.exists) throw new Error('Concours introuvable.');
    if (!candidateDoc.exists) throw new Error('Candidat introuvable.');

    // Le webhook peut être rejoué : le vote porte l'id de la commande.
    if (existingVote.exists) {
      console.warn(`[APPLY PAID VOTES] ⚠️ Votes déjà crédités pour ${params.orderId}`);
      return;
    }

    const vote: Omit<Vote, 'id'> = {
      competitionId: params.competitionId,
      candidateId: params.candidateId,
      candidateName: params.candidateName,
      userId: params.userId || '',
      voterEmail: params.voterEmail || '',
      voterName: params.voterName || '',
      quantity: params.quantity,
      type: 'paid',
      orderId: params.orderId,
      createdAt: new Date().toISOString(),
    };

    transaction.set(voteRef, vote);
    transaction.update(candidateRef, {
      voteCount: FieldValue.increment(params.quantity),
      paidVoteCount: FieldValue.increment(params.quantity),
    });
    transaction.update(competitionRef, {
      'stats.totalVotes': FieldValue.increment(params.quantity),
      'stats.paidVotes': FieldValue.increment(params.quantity),
      'stats.totalRevenue': FieldValue.increment(params.amount),
    });
  });

  revalidatePath(`/competitions/${params.competitionId}`);
  revalidatePath(`/competitions/${params.competitionId}/candidates/${params.candidateId}`);
}

/** Historique des votes de l'utilisateur connecté. */
export async function getMyVotes(): Promise<Vote[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const snapshot = await firestore
    .collection('votes')
    .where('userId', '==', session.user.id)
    .get();

  const votes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Vote);

  return votes.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
