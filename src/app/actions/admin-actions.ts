'use server';

import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { toCompetition, toUser } from '@/lib/supabase/mappers';
import { COMPETITION_COLUMNS, type CompetitionRow, type UserRow } from '@/lib/supabase/types';
import type { Competition, User } from '@/lib/types';

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('Accès non autorisé. Seuls les administrateurs sont permis.');
  }
  return session.user;
}

/** Tous les concours de la plateforme (admin seulement). */
export async function getAllCompetitions(): Promise<Competition[]> {
  try {
    await ensureAdmin();

    const { data, error } = await getSupabaseAdmin()
      .from('competitions')
      .select(COMPETITION_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data as unknown as CompetitionRow[]).map(toCompetition);
  } catch (error) {
    console.error('[ADMIN COMPETITIONS] ❌', error);
    if (error instanceof Error && error.message.includes('Accès non autorisé')) {
      throw error;
    }
    return [];
  }
}

/** Tous les utilisateurs (admin seulement). */
export async function getAllUsers(): Promise<User[]> {
  try {
    await ensureAdmin();

    const { data, error } = await getSupabaseAdmin()
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data as UserRow[]).map(toUser);
  } catch (error) {
    console.error('[ADMIN USERS] ❌', error);
    if (error instanceof Error && error.message.includes('Accès non autorisé')) {
      throw error;
    }
    return [];
  }
}

/**
 * Supprime un concours (admin seulement).
 * Candidats, packs et messages partent en cascade ; commandes et votes sont
 * conservés pour la comptabilité.
 */
export async function deleteCompetitionAsAdmin(
  competitionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAdmin();

    const { error } = await getSupabaseAdmin()
      .from('competitions')
      .delete()
      .eq('id', competitionId);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (error) {
    console.error('[ADMIN DELETE COMPETITION] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression',
    };
  }
}

/** Active ou désactive un compte (admin seulement). */
export async function updateUserStatus(
  userId: string,
  disabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAdmin();

    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({ disabled })
      .eq('id', userId);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (error) {
    console.error('[ADMIN UPDATE USER] ❌', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour',
    };
  }
}

/**
 * État de configuration de la passerelle de paiement.
 *
 * La clé Paystack est secrète : cette action ne renvoie qu'un booléen et le
 * mode (test ou production), déduit du préfixe de la clé. Elle ne divulgue
 * jamais la clé elle-même, contrairement à l'identifiant marchand public de
 * l'ancienne passerelle.
 */
export async function getPaymentGatewayStatus(): Promise<{
  configured: boolean;
  mode: 'test' | 'live' | 'inconnu';
}> {
  try {
    await ensureAdmin();

    const key = process.env.PAYSTACK_SECRET_KEY ?? '';
    if (!key) return { configured: false, mode: 'inconnu' };

    return {
      configured: true,
      mode: key.startsWith('sk_test_')
        ? 'test'
        : key.startsWith('sk_live_')
          ? 'live'
          : 'inconnu',
    };
  } catch (error) {
    console.error('[PAYMENT GATEWAY STATUS] ❌', error);
    return { configured: false, mode: 'inconnu' };
  }
}
