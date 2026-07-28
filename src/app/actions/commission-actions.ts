'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { Order, User } from '@/lib/types';

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

// ==================== HELPERS ====================

/**
 * Helper function to verify admin role
 */
async function ensureAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('Accès non autorisé. Seuls les administrateurs sont permis.');
  }
  return session.user;
}

// ==================== ACTIONS ====================

/**
 * Récupère les paramètres de commission
 */
export async function getCommissionSettings(): Promise<CommissionSettings> {
  try {
    await ensureAdmin();
    console.log('[COMMISSION SETTINGS] 📊 Fetching settings...');
    
    // Récupérer les paramètres depuis Firestore
    const settingsDoc = await firestore
      .collection('percentageConfigurations')
      .doc('default')
      .get();

    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      return {
        platformFeePercentage: data?.platformFeePercentage || 5,
        transactionFeePercentage: data?.transactionFeePercentage || 2.5,
      };
    }

    // Valeurs par défaut
    return {
      platformFeePercentage: 5,
      transactionFeePercentage: 2.5,
    };

  } catch (error) {
    console.error('[COMMISSION SETTINGS] ❌ Error:', error);
    // Retourner les valeurs par défaut en cas d'erreur (y compris d'auth)
    return {
      platformFeePercentage: 5,
      transactionFeePercentage: 2.5,
    };
  }
}

/**
 * Met à jour les paramètres de commission
 */
export async function updateCommissionSettings(
  platformFee: number,
  transactionFee: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await ensureAdmin();
    console.log('[UPDATE COMMISSION] 📝 Updating settings...');

    // Validation
    if (platformFee < 0 || platformFee > 100) {
      return { success: false, error: 'Le pourcentage de commission doit être entre 0 et 100' };
    }
    if (transactionFee < 0 || transactionFee > 100) {
      return { success: false, error: 'Les frais de transaction doivent être entre 0 et 100' };
    }

    // Mettre à jour dans Firestore
    await firestore
      .collection('percentageConfigurations')
      .doc('default')
      .set({
        platformFeePercentage: platformFee,
        transactionFeePercentage: transactionFee,
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      }, { merge: true });

    console.log('[UPDATE COMMISSION] ✅ Settings updated');
    revalidatePath('/admin/commissions');
    return { success: true };

  } catch (error) {
    console.error('[UPDATE COMMISSION] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour';
    return { success: false, error: errorMessage };
  }
}

/**
 * Récupère les paiements à effectuer par organisateur
 */
export async function getOrganizerPayouts(): Promise<OrganizerPayout[]> {
  try {
    await ensureAdmin();
    console.log('[ORGANIZER PAYOUTS] 📊 Fetching payouts...');
    
    // Récupérer les paramètres de commission
    const settings = await getCommissionSettings();
    const totalFeePercentage = settings.platformFeePercentage + settings.transactionFeePercentage;

    // Récupérer toutes les commandes payées (votes + accès live)
    const ordersSnapshot = await firestore
      .collection('orders')
      .where('status', '==', 'PAID')
      .get();

    const orders = (ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Récupérer tous les organisateurs
    const usersSnapshot = await firestore
      .collection('users')
      .where('role', '==', 'organizer')
      .get();

    const organizers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];

    // Calculer les paiements par organisateur
    const payouts: OrganizerPayout[] = organizers.map(organizer => {
      const organizerOrders = orders.filter(o => o.organizerId === organizer.id);
      const totalRevenue = organizerOrders.reduce((sum, order) => sum + order.amount, 0);

      const platformCommission = totalRevenue * (settings.platformFeePercentage / 100);
      const transactionFees = totalRevenue * (settings.transactionFeePercentage / 100);
      const netPayout = totalRevenue - platformCommission - transactionFees;

      // Dernière commande
      const lastOrder = organizerOrders.length > 0 ? organizerOrders[0] : null;

      return {
        organizerId: organizer.id,
        organizerName: organizer.name,
        organizerEmail: organizer.email,
        totalRevenue,
        platformCommission,
        transactionFees,
        netPayout,
        ordersCount: organizerOrders.length,
        lastOrderDate: lastOrder?.createdAt,
      };
    });

    // Trier par revenus décroissants
    payouts.sort((a, b) => b.totalRevenue - a.totalRevenue);

    console.log(`[ORGANIZER PAYOUTS] ✅ Fetched ${payouts.length} payouts`);
    return payouts;

  } catch (error) {
    console.error('[ORGANIZER PAYOUTS] ❌ Error:', error);
    return [];
  }
}

/**
 * Récupère les dernières transactions
 */
export async function getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
  try {
    await ensureAdmin();
    console.log('[RECENT TRANSACTIONS] 📋 Fetching transactions...');
    
    // Les commissions sont dérivées des commandes payées les plus récentes.
    const ordersSnapshot = await firestore
      .collection('orders')
      .where('status', '==', 'PAID')
      .get();

    const orders = (ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    // Récupérer les paramètres de commission
    const settings = await getCommissionSettings();

    const transactions: Transaction[] = orders.map(order => {
      const commission = order.amount * (settings.platformFeePercentage / 100);
      const label =
        order.type === 'VOTE_PACK'
          ? `Commission sur ${order.votes ?? 0} votes - ${order.candidateName ?? ''}`
          : `Commission sur accès live - ${order.competitionTitle}`;

      return {
        id: order.id,
        organizerId: order.organizerId,
        amount: commission,
        type: 'commission' as const,
        status: 'paid' as const,
        date: order.createdAt,
        description: label,
      };
    });

    console.log(`[RECENT TRANSACTIONS] ✅ Fetched ${transactions.length} transactions`);
    return transactions;

  } catch (error) {
    console.error('[RECENT TRANSACTIONS] ❌ Error:', error);
    return [];
  }
}

/**
 * Effectue un paiement à un organisateur
 */
export async function fundOrganizer(
  organizerId: string,
  amount: number
): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  try {
    const user = await ensureAdmin();
    console.log('[FUND ORGANIZER] 💰 Processing payment...');
    
    // Validation
    if (amount <= 0) {
      return { success: false, error: 'Le montant doit être supérieur à 0' };
    }

    // Vérifier que l'organisateur existe
    const organizerDoc = await firestore
      .collection('users')
      .doc(organizerId)
      .get();

    if (!organizerDoc.exists || organizerDoc.data()?.role !== 'organizer') {
      return { success: false, error: 'Organisateur introuvable' };
    }

    // Créer la transaction (collection à créer dans Firestore)
    const transactionRef = await firestore.collection('transactions').add({
      organizerId,
      amount,
      type: 'payout',
      status: 'paid',
      date: new Date().toISOString(),
      description: `Versement effectué par ${user.name || user.email}`,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    });

    console.log('[FUND ORGANIZER] ✅ Payment recorded:', transactionRef.id);
    revalidatePath('/admin/commissions');
    
    return { 
      success: true, 
      transactionId: transactionRef.id 
    };

  } catch (error) {
    console.error('[FUND ORGANIZER] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors du traitement du paiement';
    return { success: false, error: errorMessage };
  }
}

/**
 * Effectue un remboursement
 */
export async function refundTransaction(
  orderId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await ensureAdmin();
    console.log('[REFUND TRANSACTION] 💸 Processing refund...');

    const orderDoc = await firestore.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return { success: false, error: 'Commande introuvable' };
    }

    const order = orderDoc.data() as Order;

    // Validation
    if (amount <= 0 || amount > order.amount) {
      return { success: false, error: 'Montant de remboursement invalide' };
    }

    // Créer la transaction de remboursement
    await firestore.collection('transactions').add({
      organizerId: order.organizerId,
      orderId,
      amount: -amount, // Négatif pour un remboursement
      type: 'refund',
      status: 'paid',
      date: new Date().toISOString(),
      description: `Remboursement: ${reason}`,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    });

    // Marquer la commande comme remboursée si le remboursement est total
    if (amount === order.amount) {
      await firestore.collection('orders').doc(orderId).update({
        status: 'REFUNDED',
        refundedAt: new Date().toISOString(),
        refundedBy: user.id,
        refundReason: reason,
      });
    }

    console.log('[REFUND TRANSACTION] ✅ Refund processed');
    revalidatePath('/admin/commissions');
    revalidatePath('/admin/orders');

    return { success: true };

  } catch (error) {
    console.error('[REFUND TRANSACTION] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors du remboursement';
    return { success: false, error: errorMessage };
  }
}
