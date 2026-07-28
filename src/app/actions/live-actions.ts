'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { isLiveFree } from '@/lib/live-utils';
import type { ActionResult, Competition, LiveAccess } from '@/lib/types';

async function requireLiveControl(competitionId: string) {
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

    if (!competition.live?.enabled) {
      return {
        success: false,
        error: "La diffusion n'est pas activée pour ce concours.",
      };
    }
    if (isLive && !competition.live.url) {
      return {
        success: false,
        error: "Renseignez l'URL du flux avant de lancer le direct.",
      };
    }

    await firestore.collection('competitions').doc(competitionId).update({
      'live.isLive': isLive,
      updatedAt: new Date().toISOString(),
    });

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
    await requireLiveControl(competitionId);

    await firestore.collection('competitions').doc(competitionId).update({
      'live.url': url,
      updatedAt: new Date().toISOString(),
    });

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
 * Le direct gratuit est ouvert à tous ; le direct payant exige un accès acheté.
 */
export async function checkLiveAccess(competitionId: string): Promise<{
  hasAccess: boolean;
  requiresLogin: boolean;
  price: number;
}> {
  const doc = await firestore.collection('competitions').doc(competitionId).get();
  if (!doc.exists) return { hasAccess: false, requiresLogin: false, price: 0 };

  const competition = { id: doc.id, ...doc.data() } as Competition;

  if (isLiveFree(competition)) {
    return { hasAccess: true, requiresLogin: false, price: 0 };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { hasAccess: false, requiresLogin: true, price: competition.live.price };
  }

  // L'organisateur et les admins accèdent toujours à leur propre diffusion.
  if (competition.organizerId === session.user.id || session.user.role === 'admin') {
    return { hasAccess: true, requiresLogin: false, price: competition.live.price };
  }

  const access = await firestore
    .collection('liveAccess')
    .where('userId', '==', session.user.id)
    .where('competitionId', '==', competitionId)
    .limit(1)
    .get();

  return {
    hasAccess: !access.empty,
    requiresLogin: false,
    price: competition.live.price,
  };
}

/**
 * Accorde l'accès au direct après paiement confirmé.
 * Appelée par le webhook ; l'id du document dérive de la commande (idempotence).
 */
export async function grantLiveAccess(params: {
  userId: string;
  competitionId: string;
  orderId: string;
  pricePaid: number;
}): Promise<void> {
  const accessRef = firestore.collection('liveAccess').doc(params.orderId);
  const existing = await accessRef.get();

  if (existing.exists) {
    console.warn(`[GRANT LIVE ACCESS] ⚠️ Accès déjà accordé pour ${params.orderId}`);
    return;
  }

  const access: Omit<LiveAccess, 'id'> = {
    userId: params.userId,
    competitionId: params.competitionId,
    orderId: params.orderId,
    pricePaid: params.pricePaid,
    purchaseDate: new Date().toISOString(),
  };

  await accessRef.set(access);
  revalidatePath(`/competitions/${params.competitionId}/live`);
}

/** Accès live achetés par l'utilisateur connecté. */
export async function getMyLiveAccess(): Promise<LiveAccess[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const snapshot = await firestore
    .collection('liveAccess')
    .where('userId', '==', session.user.id)
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as LiveAccess)
    .sort(
      (a, b) =>
        new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );
}

/** Concours actuellement en direct, pour la mise en avant sur l'accueil. */
export async function getLiveNowCompetitions(): Promise<Competition[]> {
  const snapshot = await firestore
    .collection('competitions')
    .where('live.isLive', '==', true)
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Competition)
    .filter((competition) => competition.status !== 'draft');
}
