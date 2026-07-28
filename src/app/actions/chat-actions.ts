'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type { ActionResult, ChatMessage, Competition, User } from '@/lib/types';

const messageSchema = z
  .string()
  .trim()
  .min(1, 'Votre message est vide.')
  .max(300, 'Message trop long (300 caractères maximum).');

/** Fenêtre anti-spam : un message toutes les 3 secondes par utilisateur. */
const MESSAGE_COOLDOWN_MS = 3000;

export async function sendChatMessage(
  competitionId: string,
  message: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Connectez-vous pour participer au chat.' };
    }

    const parsed = messageSchema.safeParse(message);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    const [competitionDoc, userDoc] = await Promise.all([
      firestore.collection('competitions').doc(competitionId).get(),
      firestore.collection('users').doc(session.user.id).get(),
    ]);

    if (!competitionDoc.exists) {
      return { success: false, error: 'Concours introuvable.' };
    }

    const competition = {
      id: competitionDoc.id,
      ...competitionDoc.data(),
    } as Competition;

    if (!competition.live?.enabled || !competition.live.chatEnabled) {
      return { success: false, error: "Le chat n'est pas ouvert sur ce direct." };
    }

    const user = userDoc.data() as User | undefined;
    if (user?.chatBanned) {
      return { success: false, error: 'Vous ne pouvez plus écrire dans ce chat.' };
    }

    const recent = await firestore
      .collection('chatMessages')
      .where('competitionId', '==', competitionId)
      .where('userId', '==', session.user.id)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!recent.empty) {
      const last = recent.docs[0].data() as ChatMessage;
      const elapsed = Date.now() - new Date(last.createdAt).getTime();
      if (elapsed < MESSAGE_COOLDOWN_MS) {
        return {
          success: false,
          error: 'Vous écrivez trop vite, patientez quelques secondes.',
        };
      }
    }

    const chatMessage: Omit<ChatMessage, 'id'> = {
      competitionId,
      userId: session.user.id,
      userName: session.user.name || 'Spectateur',
      userRole: (session.user.role as ChatMessage['userRole']) || 'customer',
      message: parsed.data,
      hidden: false,
      createdAt: new Date().toISOString(),
    };

    await firestore.collection('chatMessages').add(chatMessage);
    return { success: true };
  } catch (error) {
    console.error('[SEND CHAT MESSAGE] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

async function requireModerator(competitionId: string) {
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
    throw new Error("Vous n'êtes pas modérateur de ce direct.");
  }

  return session.user;
}

/** Masque un message sans le supprimer, pour garder une trace de modération. */
export async function hideChatMessage(
  competitionId: string,
  messageId: string
): Promise<ActionResult> {
  try {
    await requireModerator(competitionId);
    await firestore.collection('chatMessages').doc(messageId).update({ hidden: true });
    return { success: true, message: 'Message masqué.' };
  } catch (error) {
    console.error('[HIDE CHAT MESSAGE] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

/** Empêche un spectateur d'écrire sur l'ensemble de la plateforme. */
export async function banUserFromChat(
  competitionId: string,
  userId: string
): Promise<ActionResult> {
  try {
    await requireModerator(competitionId);
    await firestore.collection('users').doc(userId).update({ chatBanned: true });
    return { success: true, message: 'Spectateur banni du chat.' };
  } catch (error) {
    console.error('[BAN USER FROM CHAT] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

export async function unbanUserFromChat(userId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    await firestore.collection('users').doc(userId).update({ chatBanned: false });
    return { success: true, message: 'Spectateur réintégré.' };
  } catch (error) {
    console.error('[UNBAN USER FROM CHAT] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}

/** Vide le chat d'un direct (fin d'émission). */
export async function clearChat(competitionId: string): Promise<ActionResult> {
  try {
    await requireModerator(competitionId);

    const snapshot = await firestore
      .collection('chatMessages')
      .where('competitionId', '==', competitionId)
      .get();

    if (snapshot.empty) return { success: true, message: 'Le chat est déjà vide.' };

    // Firestore limite un batch à 500 opérations.
    for (let i = 0; i < snapshot.docs.length; i += 450) {
      const batch = firestore.batch();
      snapshot.docs.slice(i, i + 450).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    return { success: true, message: 'Chat vidé.' };
  } catch (error) {
    console.error('[CLEAR CHAT] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}
