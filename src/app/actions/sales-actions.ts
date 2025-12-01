'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type { Sale, Event } from '@/lib/types';

/**
 * Récupère les ventes pour le dashboard organisateur
 */
export async function getOrganizerSales(): Promise<Sale[]> {
  try {
    console.log('[ORGANIZER SALES] 📋 Fetching sales...');
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log('[ORGANIZER SALES] ❌ Not authenticated');
      return [];
    }

    // Récupérer les ventes de l'organisateur connecté
    const salesSnapshot = await firestore
      .collection('sales')
      .where('organizerId', '==', session.user.id)
      .orderBy('purchaseDate', 'desc')
      .get();
    
    const sales = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Sale[];

    console.log(`[ORGANIZER SALES] ✅ Fetched ${sales.length} sales`);
    return sales;

  } catch (error: any) {
    console.error('[ORGANIZER SALES] ❌ Error:', error);

    // Si c'est une erreur d'index manquant, afficher l'URL de création
    if (error?.message?.includes('index')) {
      console.error('[ORGANIZER SALES] 💡 Index manquant. Créez-le avec: firebase deploy --only firestore:indexes');
      console.error('[ORGANIZER SALES] 💡 Ou via la console Firebase:', error.message);
    }

    return [];
  }
}

/**
 * Récupère toutes les ventes (admin seulement)
 */
export async function getAdminSales(): Promise<Sale[]> {
  try {
    console.log('[ADMIN SALES] 📋 Fetching all sales...');
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log('[ADMIN SALES] ❌ Not authenticated');
      return [];
    }

    // TODO: Vérifier que c'est un admin
    // Pour l'instant on suppose que si on est sur /admin, on est admin
    
    const salesSnapshot = await firestore
      .collection('sales')
      .orderBy('purchaseDate', 'desc')
      .get();
    
    const sales = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Sale[];

    console.log(`[ADMIN SALES] ✅ Fetched ${sales.length} sales`);
    return sales;

  } catch (error) {
    console.error('[ADMIN SALES] ❌ Error:', error);
    return [];
  }
}

/**
 * Récupère les événements pour les noms dans les tableaux
 */
export async function getEventsForSales(): Promise<Event[]> {
  try {
    const eventsSnapshot = await firestore.collection('events').get();
    
    return eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Event[];

  } catch (error) {
    console.error('[EVENTS FOR SALES] ❌ Error:', error);
    return [];
  }
}

/**
 * Exporte les ventes en CSV
 */
export async function exportSalesCSV(sales: Sale[], events: Event[]): Promise<string> {
  const headers = ['Date', 'Événement', 'Client', 'Email', 'Quantité', 'Montant'];
  
  const rows = sales.map(sale => {
    const event = events.find(e => e.id === sale.eventId);
    return [
      new Date(sale.purchaseDate).toLocaleDateString('fr-FR'),
      event?.name || 'Événement inconnu',
      sale.customerName,
      sale.customerEmail,
      sale.quantity.toString(),
      `${sale.totalPrice.toLocaleString('fr-FR')} F CFA`
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}