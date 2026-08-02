'use server';

import { auth } from '@/auth';
import { checkCredentials } from '@/lib/paystack';
import { resolveBaseUrl } from '@/lib/base-url';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { UserFacingError, userMessage } from '@/lib/errors';
import { toCompetition, toUser } from '@/lib/supabase/mappers';
import {
  COMPETITION_COLUMNS,
  type CompetitionRow,
  type SafeUserRow,
} from '@/lib/supabase/types';
import type { Competition, User } from '@/lib/types';

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    throw new UserFacingError('Accès non autorisé. Seuls les administrateurs sont permis.');
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
    if (error instanceof UserFacingError) {
      throw error;
    }
    return [];
  }
}

/** Tous les utilisateurs (admin seulement). */
export async function getAllUsers(): Promise<User[]> {
  try {
    await ensureAdmin();

    /*
     * Colonnes explicites plutôt que `*` : rapatrier `password_hash` pour
     * afficher une liste d'utilisateurs n'apporte rien et l'expose au moindre
     * accident de journalisation ou de sérialisation.
     */
    const { data, error } = await getSupabaseAdmin()
      .from('users')
      .select(
        'id, name, email, role, avatar, bio, phone, disabled, deleted, deleted_at, ' +
          'chat_banned, notification_preferences, created_at, updated_at'
      )
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data as unknown as SafeUserRow[]).map(toUser);
  } catch (error) {
    console.error('[ADMIN USERS] ❌', error);
    if (error instanceof UserFacingError) {
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
      error: userMessage(error, 'Erreur lors de la suppression'),
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
      error: userMessage(error, 'Erreur lors de la mise à jour'),
    };
  }
}

export type PaymentGatewayStatus = {
  /** La clé est présente et bien formée. */
  configured: boolean;
  mode: 'test' | 'live' | 'inconnu';
  /** La clé a été acceptée par l'API Paystack. */
  reachable: boolean;
  /** Cause précise de l'échec, à destination de l'administrateur. */
  problem?: string;
  /** Domaine réellement utilisé pour le retour après paiement. */
  baseUrl: string;
  /** URL à déclarer dans le tableau de bord Paystack. */
  webhookUrl: string;
  /** `NEXT_PUBLIC_BASE_URL` est absente : le domaine vient de l'hébergeur. */
  baseUrlInferred: boolean;
};

/**
 * État de configuration de la passerelle de paiement.
 *
 * La clé Paystack est secrète : cette action ne renvoie jamais sa valeur, mais
 * le résultat d'un appel réel à l'API. Cela distingue les trois situations que
 * le message « Invalid key » confond : clé absente, clé mal recopiée, ou clé
 * valide mais compte inaccessible.
 */
export async function getPaymentGatewayStatus(): Promise<PaymentGatewayStatus> {
  const baseUrl = resolveBaseUrl();
  const urls = {
    baseUrl,
    webhookUrl: `${baseUrl}/api/payment/webhook`,
    baseUrlInferred: !process.env.NEXT_PUBLIC_BASE_URL?.trim(),
  };

  try {
    await ensureAdmin();

    const key = (process.env.PAYSTACK_SECRET_KEY ?? '').trim();
    if (!key) {
      return {
        ...urls,
        configured: false,
        mode: 'inconnu',
        reachable: false,
        problem: "La variable PAYSTACK_SECRET_KEY n'est pas définie.",
      };
    }

    const mode = key.startsWith('sk_test_')
      ? ('test' as const)
      : key.startsWith('sk_live_')
        ? ('live' as const)
        : ('inconnu' as const);

    const check = await checkCredentials();
    if (!check.ok) {
      return {
        ...urls,
        configured: mode !== 'inconnu',
        mode,
        reachable: false,
        problem: check.reason,
      };
    }

    return { ...urls, configured: true, mode, reachable: true };
  } catch (error) {
    console.error('[PAYMENT GATEWAY STATUS] ❌', error);
    return {
      ...urls,
      configured: false,
      mode: 'inconnu',
      reachable: false,
      problem: 'Vérification impossible.',
    };
  }
}
