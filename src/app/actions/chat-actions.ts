'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { UserFacingError, userMessage } from '@/lib/errors';
import type { CompetitionRow, UserRow } from '@/lib/supabase/types';
import { consumeRateLimit } from '@/lib/rate-limit';
import type { ActionResult } from '@/lib/types';

const messageSchema = z
  .string()
  .trim()
  .min(1, 'Votre message est vide.')
  .max(300, 'Message trop long (300 caractères maximum).');

/** Fenêtre anti-spam : un message toutes les 3 secondes par utilisateur. */
const MESSAGE_COOLDOWN_SECONDS = 3;

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

    const [competitionResult, userResult, banResult] = await Promise.all([
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
        .from('chat_bans')
        .select('id')
        .eq('competition_id', competitionId)
        .eq('user_id', session.user.id)
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
    if (user?.chat_banned || banResult.data) {
      return { success: false, error: 'Vous ne pouvez plus écrire dans ce chat.' };
    }

    /*
     * Le délai était appliqué en lisant le dernier message puis en écrivant :
     * deux envois simultanés lisaient le même « dernier message » et passaient
     * tous les deux. Le compteur en base fait l'incrément et la lecture dans
     * une seule instruction.
     */
    const verdict = await consumeRateLimit(`chat:${competitionId}:${session.user.id}`, {
      max: 1,
      windowSeconds: MESSAGE_COOLDOWN_SECONDS,
    });
    if (!verdict.allowed) {
      return {
        success: false,
        error: 'Vous écrivez trop vite, patientez quelques secondes.',
      };
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
      error: userMessage(error, 'Erreur inconnue.'),
    };
  }
}

async function requireModerator(competitionId: string) {
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
    throw new UserFacingError("Vous n'êtes pas modérateur de ce direct.");
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
      error: userMessage(error, 'Erreur inconnue.'),
    };
  }
}

/**
 * Empêche un spectateur d'écrire **sur cette diffusion**.
 *
 * La portée est locale : un organisateur modère son antenne, pas la
 * plateforme. Le bannissement à l'échelle du site reste une décision
 * d'administration (`setPlatformChatBan`).
 */
export async function banUserFromChat(
  competitionId: string,
  userId: string
): Promise<ActionResult> {
  try {
    const moderator = await requireModerator(competitionId);

    if (userId === moderator.id) {
      return { success: false, error: 'Vous ne pouvez pas vous bannir vous-même.' };
    }

    const supabase = getSupabaseAdmin();

    // Un modérateur ne peut pas réduire au silence un administrateur.
    const { data: target } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (!target) return { success: false, error: 'Utilisateur introuvable.' };
    if ((target as Pick<UserRow, 'role'>).role === 'admin' && moderator.role !== 'admin') {
      return { success: false, error: 'Cet utilisateur ne peut pas être banni.' };
    }

    const { error } = await supabase
      .from('chat_bans')
      .upsert(
        { competition_id: competitionId, user_id: userId, banned_by: moderator.id },
        { onConflict: 'user_id,competition_id' }
      );

    if (error) throw new Error(error.message);

    return { success: true, message: 'Spectateur banni de ce direct.' };
  } catch (error) {
    console.error('[BAN USER FROM CHAT] ❌', error);
    return {
      success: false,
      error: userMessage(error, 'Erreur inconnue.'),
    };
  }
}

/**
 * Lève le bannissement sur cette diffusion.
 *
 * Le modérateur qui a prononcé la sanction peut la défaire : lui imposer de
 * solliciter un administrateur transformait une erreur de modération en
 * incident.
 */
export async function unbanUserFromChat(
  competitionId: string,
  userId: string
): Promise<ActionResult> {
  try {
    await requireModerator(competitionId);

    const { error } = await getSupabaseAdmin()
      .from('chat_bans')
      .delete()
      .eq('competition_id', competitionId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    return { success: true, message: 'Spectateur réintégré.' };
  } catch (error) {
    console.error('[UNBAN USER FROM CHAT] ❌', error);
    return {
      success: false,
      error: userMessage(error, 'Erreur inconnue.'),
    };
  }
}

/** Bannissement du chat sur toute la plateforme — administration seulement. */
export async function setPlatformChatBan(
  userId: string,
  banned: boolean
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({ chat_banned: banned })
      .eq('id', userId);

    if (error) throw new Error(error.message);

    return {
      success: true,
      message: banned ? 'Banni du chat sur toute la plateforme.' : 'Réintégré.',
    };
  } catch (error) {
    console.error('[PLATFORM CHAT BAN] ❌', error);
    return {
      success: false,
      error: userMessage(error, 'Erreur inconnue.'),
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
      error: userMessage(error, 'Erreur inconnue.'),
    };
  }
}
