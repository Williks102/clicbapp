'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { Sale, User } from '@/lib/types';

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
  salesCount: number;
  lastSaleDate?: string;
};

export type CommissionSettings = {
  platformFeePercentage: number;
  transactionFeePercentage: number;
};

// ==================== ACTIONS ====================

/**
 * Récupère les paramètres de commission
 */
export async function getCommissionSettings(): Promise<CommissionSettings> {
  try {
    console.log('[COMMISSION SETTINGS] 📊 Fetching settings...');
    
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Non authentifié');
    }

    // TODO: Vérifier que c'est un admin

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
    console.log('[UPDATE COMMISSION] 📝 Updating settings...');
    
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    // TODO: Vérifier que c'est un admin

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
        updatedBy: session.user.id,
      }, { merge: true });

    console.log('[UPDATE COMMISSION] ✅ Settings updated');
    revalidatePath('/admin/commissions');
    return { success: true };

  } catch (error) {
    console.error('[UPDATE COMMISSION] ❌ Error:', error);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
}

/**
 * Récupère les paiements à effectuer par organisateur
 */
export async function getOrganizerPayouts(): Promise<OrganizerPayout[]> {
  try {
    console.log('[ORGANIZER PAYOUTS] 📊 Fetching payouts...');
    
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    // TODO: Vérifier que c'est un admin

    // Récupérer les paramètres de commission
    const settings = await getCommissionSettings();
    const totalFeePercentage = settings.platformFeePercentage + settings.transactionFeePercentage;

    // Récupérer toutes les ventes
    const salesSnapshot = await firestore
      .collection('sales')
      .orderBy('purchaseDate', 'desc')
      .get();

    const sales = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Sale[];

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
      const organizerSales = sales.filter(s => s.organizerId === organizer.id);
      const totalRevenue = organizerSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
      
      const platformCommission = totalRevenue * (settings.platformFeePercentage / 100);
      const transactionFees = totalRevenue * (settings.transactionFeePercentage / 100);
      const netPayout = totalRevenue - platformCommission - transactionFees;

      // Dernière vente
      const lastSale = organizerSales.length > 0 ? organizerSales[0] : null;

      return {
        organizerId: organizer.id,
        organizerName: organizer.name,
        organizerEmail: organizer.email,
        totalRevenue,
        platformCommission,
        transactionFees,
        netPayout,
        salesCount: organizerSales.length,
        lastSaleDate: lastSale?.purchaseDate,
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
    console.log('[RECENT TRANSACTIONS] 📋 Fetching transactions...');
    
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    // TODO: Vérifier que c'est un admin

    // Pour l'instant, on génère des transactions basées sur les ventes récentes
    // Plus tard, on créera une vraie collection 'transactions'
    const salesSnapshot = await firestore
      .collection('sales')
      .orderBy('purchaseDate', 'desc')
      .limit(limit)
      .get();

    const sales = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Sale[];

    // Récupérer les paramètres de commission
    const settings = await getCommissionSettings();

    // Convertir les ventes en transactions
    const transactions: Transaction[] = sales.map(sale => {
      const commission = sale.totalPrice * (settings.platformFeePercentage / 100);
      
      return {
        id: sale.id,
        organizerId: sale.organizerId,
        amount: commission,
        type: 'commission' as const,
        status: 'paid' as const,
        date: sale.purchaseDate,
        description: `Commission sur vente - ${sale.customerName}`,
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
    console.log('[FUND ORGANIZER] 💰 Processing payment...');
    
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    // TODO: Vérifier que c'est un admin

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
      description: `Versement effectué par ${session.user.name || session.user.email}`,
      createdBy: session.user.id,
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
    return { success: false, error: 'Erreur lors du traitement du paiement' };
  }
}

/**
 * Effectue un remboursement
 */
export async function refundTransaction(
  saleId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[REFUND TRANSACTION] 💸 Processing refund...');
    
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    // TODO: Vérifier que c'est un admin

    // Récupérer la vente
    const saleDoc = await firestore.collection('sales').doc(saleId).get();
    if (!saleDoc.exists) {
      return { success: false, error: 'Vente introuvable' };
    }

    const sale = saleDoc.data() as Sale;

    // Validation
    if (amount <= 0 || amount > sale.totalPrice) {
      return { success: false, error: 'Montant de remboursement invalide' };
    }

    // Créer la transaction de remboursement
    await firestore.collection('transactions').add({
      organizerId: sale.organizerId,
      saleId: saleId,
      amount: -amount, // Négatif pour un remboursement
      type: 'refund',
      status: 'paid',
      date: new Date().toISOString(),
      description: `Remboursement: ${reason}`,
      createdBy: session.user.id,
      createdAt: new Date().toISOString(),
    });

    // Mettre à jour le statut de la vente si remboursement total
    if (amount === sale.totalPrice) {
      await firestore.collection('sales').doc(saleId).update({
        status: 'refunded',
        refundedAt: new Date().toISOString(),
        refundedBy: session.user.id,
        refundReason: reason,
      });
    }

    console.log('[REFUND TRANSACTION] ✅ Refund processed');
    revalidatePath('/admin/commissions');
    revalidatePath('/admin/sales');
    
    return { success: true };

  } catch (error) {
    console.error('[REFUND TRANSACTION] ❌ Error:', error);
    return { success: false, error: 'Erreur lors du remboursement' };
  }
}