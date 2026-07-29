'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { ChatMessageRow, CompetitionRow, UserRow } from '@/lib/supabase/types';
import type { ActionResult } from '@/lib/types';

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

    const supabase = getSupabaseAdmin();

    const [competitionResult, userResult, recentResult] = await Promise.all([
      supabase
        .from('competitions')
        .select('id, live_enabled, live_chat_enabled')
        .eq('id', competitionId)
        .maybeSingle(),
      supabase
        .from('users')
        .select('chat_banned')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabase
        .from('chat_messages')
        .select('created_at')
        .eq('competition_id', competitionId)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const competition = competitionResult.data as Pick<
      CompetitionRow,
      'id' | 'live_enabled' | 'live_chat_enabled'
    > | null;

    if (!competition) return { success: false, error: 'Concours introuvable.' };
    if (!competition.live_enabled || !competition.live_chat_enabled) {
      return { success: false, error: "Le chat n'est pas ouvert sur ce direct." };
    }

    const user = userResult.data as Pick<UserRow, 'chat_banned'> | null;
    if (user?.chat_banned) {
      return { success: false, error: 'Vous ne pouvez plus écrire dans ce chat.' };
    }

    const last = recentResult.data as Pick<ChatMessageRow, 'created_at'> | null;
    if (last) {
      const elapsed = Date.now() - new Date(last.created_at).getTime();
      if (elapsed < MESSAGE_COOLDOWN_MS) {
        return {
          success: false,
          error: 'Vous écrivez trop vite, patientez quelques secondes.',
        };
      }
    }

    const { error } = await supabase.from('chat_messages').insert({
      competition_id: competitionId,
      user_id: session.user.id,
      user_name: session.user.name || 'Spectateur',
      user_role: session.user.role || 'customer',
      message: parsed.data,
    });

    if (error) throw new Error(error.message);

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

  const { data, error } = await getSupabaseAdmin()
    .from('competitions')
    .select('id, organizer_id')
    .eq('id', competitionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Concours introuvable.');

  const competition = data as Pick<CompetitionRow, 'id' | 'organizer_id'>;
  if (competition.organizer_id !== session.user.id && session.user.role !== 'admin') {
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

    const { error } = await getSupabaseAdmin()
      .from('chat_messages')
      .update({ hidden: true })
      .eq('id', messageId)
      .eq('competition_id', competitionId);

    if (error) throw new Error(error.message);

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

    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({ chat_banned: true })
      .eq('id', userId);

    if (error) throw new Error(error.message);

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

    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({ chat_banned: false })
      .eq('id', userId);

    if (error) throw new Error(error.message);

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

    const { error } = await getSupabaseAdmin()
      .from('chat_messages')
      .delete()
      .eq('competition_id', competitionId);

    if (error) throw new Error(error.message);

    return { success: true, message: 'Chat vidé.' };
  } catch (error) {
    console.error('[CLEAR CHAT] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue.',
    };
  }
}
