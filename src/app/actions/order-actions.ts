'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import { generateId } from '@/lib/utils';
import { isVotingOpen } from '@/lib/live-utils';
import type {
  Candidate,
  Competition,
  Order,
  PaymentInitResult,
} from '@/lib/types';

const votePackOrderSchema = z.object({
  competitionId: z.string().min(1),
  candidateId: z.string().min(1),
  packId: z.string().min(1),
  fullName: z.string().min(2, 'Le nom complet est requis.'),
  email: z.string().email('Adresse e-mail invalide.'),
  phone: z.string().min(8, 'Numéro de téléphone invalide.'),
});

export type VotePackOrderInput = z.infer<typeof votePackOrderSchema>;

/**
 * Crée une commande PENDING pour un pack de votes.
 * Le prix et le nombre de votes proviennent exclusivement de Firestore :
 * le client ne peut pas les manipuler.
 */
export async function initializeVotePackOrder(
  data: VotePackOrderInput
): Promise<PaymentInitResult> {
  try {
    const parsed = votePackOrderSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(', '),
      };
    }

    const values = parsed.data;
    const session = await auth();

    const [competitionDoc, candidateDoc] = await Promise.all([
      firestore.collection('competitions').doc(values.competitionId).get(),
      firestore.collection('candidates').doc(values.candidateId).get(),
    ]);

    if (!competitionDoc.exists) {
      return { success: false, error: 'Concours introuvable.' };
    }
    if (!candidateDoc.exists) {
      return { success: false, error: 'Candidat introuvable.' };
    }

    const competition = {
      id: competitionDoc.id,
      ...competitionDoc.data(),
    } as Competition;
    const candidate = { id: candidateDoc.id, ...candidateDoc.data() } as Candidate;

    if (candidate.competitionId !== competition.id) {
      return { success: false, error: "Ce candidat ne participe pas à ce concours." };
    }
    if (candidate.eliminated) {
      return { success: false, error: 'Ce candidat est éliminé.' };
    }
    if (!isVotingOpen(competition)) {
      return { success: false, error: 'Les votes ne sont pas ouverts pour ce concours.' };
    }

    const pack = competition.votePacks?.find((p) => p.id === values.packId);
    if (!pack) {
      return { success: false, error: 'Pack de votes introuvable.' };
    }

    const reference = generateId(`VOTE-${competition.id.slice(0, 4)}`);

    const order: Order = {
      id: reference,
      type: 'VOTE_PACK',
      competitionId: competition.id,
      competitionTitle: competition.title,
      organizerId: competition.organizerId,
      candidateId: candidate.id,
      candidateName: candidate.name,
      packId: pack.id,
      packName: pack.name,
      votes: pack.votes,
      amount: pack.price,
      customerName: values.fullName,
      customerEmail: values.email,
      customerPhone: values.phone,
      userId: session?.user?.id || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    await firestore.collection('orders').doc(reference).set(order);

    return {
      success: true,
      reference,
      amount: pack.price,
      merchantId: process.env.NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID,
      description: `${pack.votes} votes pour ${candidate.name} — ${competition.title}`,
    };
  } catch (error) {
    console.error('[INIT VOTE ORDER] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

const liveAccessOrderSchema = z.object({
  competitionId: z.string().min(1),
  fullName: z.string().min(2, 'Le nom complet est requis.'),
  email: z.string().email('Adresse e-mail invalide.'),
  phone: z.string().min(8, 'Numéro de téléphone invalide.'),
});

export type LiveAccessOrderInput = z.infer<typeof liveAccessOrderSchema>;

/** Crée une commande PENDING pour l'accès à une diffusion payante. */
export async function initializeLiveAccessOrder(
  data: LiveAccessOrderInput
): Promise<PaymentInitResult> {
  try {
    const parsed = liveAccessOrderSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(', '),
      };
    }

    const values = parsed.data;
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Connectez-vous pour acheter un accès au direct.',
      };
    }

    const competitionDoc = await firestore
      .collection('competitions')
      .doc(values.competitionId)
      .get();

    if (!competitionDoc.exists) {
      return { success: false, error: 'Concours introuvable.' };
    }

    const competition = {
      id: competitionDoc.id,
      ...competitionDoc.data(),
    } as Competition;

    if (!competition.live?.enabled) {
      return { success: false, error: "Ce concours n'a pas de diffusion en direct." };
    }
    if (!competition.live.paid || competition.live.price <= 0) {
      return { success: false, error: 'Le direct est en accès libre.' };
    }

    const existingAccess = await firestore
      .collection('liveAccess')
      .where('userId', '==', session.user.id)
      .where('competitionId', '==', competition.id)
      .limit(1)
      .get();

    if (!existingAccess.empty) {
      return { success: false, error: 'Vous avez déjà accès à ce direct.' };
    }

    const reference = generateId(`LIVE-${competition.id.slice(0, 4)}`);

    const order: Order = {
      id: reference,
      type: 'LIVE_ACCESS',
      competitionId: competition.id,
      competitionTitle: competition.title,
      organizerId: competition.organizerId,
      amount: competition.live.price,
      customerName: values.fullName,
      customerEmail: values.email,
      customerPhone: values.phone,
      userId: session.user.id,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    await firestore.collection('orders').doc(reference).set(order);

    return {
      success: true,
      reference,
      amount: competition.live.price,
      merchantId: process.env.NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID,
      description: `Accès au direct — ${competition.live.title || competition.title}`,
    };
  } catch (error) {
    console.error('[INIT LIVE ORDER] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

// ==================== LECTURE ====================

export async function getOrder(reference: string): Promise<Order | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const doc = await firestore.collection('orders').doc(reference).get();
  if (!doc.exists) return null;

  const order = { id: doc.id, ...doc.data() } as Order;

  const isOwner =
    order.userId === session.user.id || order.customerEmail === session.user.email;
  const isOrganizer = order.organizerId === session.user.id;

  if (!isOwner && !isOrganizer && session.user.role !== 'admin') return null;

  return order;
}

/**
 * Statut d'une commande consultable depuis la page de retour de paiement.
 * La référence est un identifiant aléatoire non devinable : aucune donnée
 * personnelle n'est exposée ici.
 */
export async function getOrderStatus(reference: string): Promise<{
  found: boolean;
  status?: Order['status'];
  type?: Order['type'];
  amount?: number;
  votes?: number;
  candidateId?: string;
  candidateName?: string;
  competitionId?: string;
  competitionTitle?: string;
}> {
  const doc = await firestore.collection('orders').doc(reference).get();
  if (!doc.exists) return { found: false };

  const order = doc.data() as Order;

  return {
    found: true,
    status: order.status,
    type: order.type,
    amount: order.amount,
    votes: order.votes,
    candidateId: order.candidateId,
    candidateName: order.candidateName,
    competitionId: order.competitionId,
    competitionTitle: order.competitionTitle,
  };
}

/** Commandes de l'utilisateur connecté. */
export async function getMyOrders(): Promise<Order[]> {
  const session = await auth();
  if (!session?.user?.email) return [];

  const snapshot = await firestore
    .collection('orders')
    .where('customerEmail', '==', session.user.email)
    .get();

  return sortByCreatedAt(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Order)
  );
}

/** Commandes reçues par un organisateur (toutes les commandes pour un admin). */
export async function getOrganizerOrders(): Promise<Order[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const query =
    session.user.role === 'admin'
      ? firestore.collection('orders')
      : firestore.collection('orders').where('organizerId', '==', session.user.id);

  const snapshot = await query.get();

  return sortByCreatedAt(
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Order)
  );
}

function sortByCreatedAt(orders: Order[]) {
  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
