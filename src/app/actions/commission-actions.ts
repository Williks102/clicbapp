'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { UserFacingError, userMessage } from '@/lib/errors';
import type { OrderRow, PlatformSettingsRow } from '@/lib/supabase/types';

// ==================== TYPES ====================

export type PayoutStatus = 'pending' | 'paid' | 'processing';

export type Transaction = {
  id: string;
  organizerId: string;
  amount: number;
  type: 'payout' | 'refund' | 'commission';
  status: PayoutStatus;
  date: string;
  description: string;
};

export type OrganizerPayout = {
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  totalRevenue: number;
  platformCommission: number;
  transactionFees: number;
  netPayout: number;
  ordersCount: number;
  lastOrderDate?: string;
};

export type CommissionSettings = {
  platformFeePercentage: number;
  transactionFeePercentage: number;
};

const DEFAULT_SETTINGS: CommissionSettings = {
  platformFeePercentage: 5,
  transactionFeePercentage: 2.5,
};

// ==================== HELPERS ====================

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    throw new UserFacingError('Accès non autorisé. Seuls les administrateurs sont permis.');
  }
  return session.user;
}

function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value) || 0;
}

// ==================== ACTIONS ====================

export async function getCommissionSettings(): Promise<CommissionSettings> {
  try {
    await ensureAdmin();

    const { data, error } = await getSupabaseAdmin()
      .from('platform_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) return DEFAULT_SETTINGS;

    const settings = data as PlatformSettingsRow;
    return {
      platformFeePercentage: num(settings.platform_fee_percentage),
      transactionFeePercentage: num(settings.transaction_fee_percentage),
    };
  } catch (error) {
    console.error('[COMMISSION SETTINGS] ❌', error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateCommissionSettings(
  platformFee: number,
  transactionFee: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await ensureAdmin();

    if (platformFee < 0 || platformFee > 100) {
      return {
        success: false,
        error: 'Le pourcentage de commission doit être entre 0 et 100',
      };
    }
    if (transactionFee < 0 || transactionFee > 100) {
      return {
        success: false,
        error: 'Les frais de transaction doivent être entre 0 et 100',
      };
    }

    const { error } = await getSupabaseAdmin().from('platform_settings').upsert({
      id: 'default',
      platform_fee_percentage: platformFee,
      transaction_fee_percentage: transactionFee,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });

    if (error) throw new Error(error.message);

    revalidatePath('/admin/commissions');
    return { success: true };
  } catch (error) {
    console.error('[UPDATE COMMISSION] ❌', error);
    return {
      success: false,
      error: userMessage(error, 'Erreur lors de la mise à jour'),
    };
  }
}

/**
 * Reversements dus par organisateur.
 * Le calcul est fait par la base : le volume de commandes n'a plus d'incidence
 * sur le coût de la page.
 */
export async function getOrganizerPayouts(): Promise<OrganizerPayout[]> {
  try {
    await ensureAdmin();

    const { data, error } = await getSupabaseAdmin().rpc('organizer_payouts');
    if (error) throw new Error(error.message);

    return (
      data as Array<{
        organizer_id: string;
        organizer_name: string;
        organizer_email: string;
        total_revenue: number | string;
        platform_commission: number | string;
        transaction_fees: number | string;
        net_payout: number | string;
        orders_count: number | string;
        last_order_date: string | null;
      }>
    ).map((row) => ({
      organizerId: row.organizer_id,
      organizerName: row.organizer_name,
      organizerEmail: row.organizer_email,
      totalRevenue: num(row.total_revenue),
      platformCommission: num(row.platform_commission),
      transactionFees: num(row.transaction_fees),
      netPayout: num(row.net_payout),
      ordersCount: num(row.orders_count),
      lastOrderDate: row.last_order_date ?? undefined,
    }));
  } catch (error) {
    console.error('[ORGANIZER PAYOUTS] ❌', error);
    return [];
  }
}

/** Dernières commissions, dérivées des commandes payées. */
export async function getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
  try {
    await ensureAdmin();

    const settings = await getCommissionSettings();

    const { data, error } = await getSupabaseAdmin()
      .from('orders')
      .select('id, organizer_id, amount, created_at, type, votes, candidate_name, competition_title')
      .eq('status', 'PAID')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return (data as OrderRow[]).map((order) => ({
      id: order.id,
      organizerId: order.organizer_id,
      amount: num(order.amount) * (settings.platformFeePercentage / 100),
      type: 'commission' as const,
      status: 'paid' as const,
      date: order.created_at,
      description:
        order.type === 'VOTE_PACK'
          ? `Commission sur ${order.votes ?? 0} votes - ${order.candidate_name ?? ''}`
          : `Commission sur accès live - ${order.competition_title}`,
    }));
  } catch (error) {
    console.error('[RECENT TRANSACTIONS] ❌', error);
    return [];
  }
}

/** Enregistre un versement effectué à un organisateur. */
export async function fundOrganizer(
  organizerId: string,
  amount: number
): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  try {
    const user = await ensureAdmin();

    if (amount <= 0) {
      return { success: false, error: 'Le montant doit être supérieur à 0' };
    }

    const supabase = getSupabaseAdmin();

    const { data: organizer } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', organizerId)
      .maybeSingle();

    if (!organizer || (organizer as { role: string }).role !== 'organizer') {
      return { success: false, error: 'Organisateur introuvable' };
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        organizer_id: organizerId,
        amount,
        type: 'payout',
        status: 'paid',
        description: `Versement effectué par ${user.name || user.email}`,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    revalidatePath('/admin/commissions');
    return { success: true, transactionId: (data as { id: string }).id };
  } catch (error) {
    console.error('[FUND ORGANIZER] ❌', error);
    return {
      success: false,
      error: userMessage(error, 'Erreur lors du traitement'),
    };
  }
}

/** Rembourse tout ou partie d'une commande. */
export async function refundTransaction(
  orderId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await ensureAdmin();
    const supabase = getSupabaseAdmin();

    const { data, error: readError } = await supabase
      .from('orders')
      .select('id, organizer_id, amount')
      .eq('id', orderId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!data) return { success: false, error: 'Commande introuvable' };

    const order = data as Pick<OrderRow, 'id' | 'organizer_id' | 'amount'>;
    const orderAmount = num(order.amount);

    if (amount <= 0 || amount > orderAmount) {
      return { success: false, error: 'Montant de remboursement invalide' };
    }

    const { error } = await supabase.from('transactions').insert({
      organizer_id: order.organizer_id,
      order_id: orderId,
      amount: -amount, // négatif : c'est un remboursement
      type: 'refund',
      status: 'paid',
      description: `Remboursement: ${reason}`,
      created_by: user.id,
    });

    if (error) throw new Error(error.message);

    // Un remboursement total repasse la commande en REFUNDED ; le trigger
    // décrémente alors le chiffre d'affaires du concours.
    if (amount === orderAmount) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'REFUNDED',
          refunded_at: new Date().toISOString(),
          refunded_by: user.id,
          refund_reason: reason,
        })
        .eq('id', orderId);

      if (updateError) throw new Error(updateError.message);
    }

    revalidatePath('/admin/commissions');
    revalidatePath('/admin/orders');
    return { success: true };
  } catch (error) {
    console.error('[REFUND TRANSACTION] ❌', error);
    return {
      success: false,
      error: userMessage(error, 'Erreur lors du remboursement'),
    };
  }
}
