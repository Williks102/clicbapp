'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type { Sale, Event, User } from '@/lib/types';

export type SaleDetails = Sale & {
  event?: Event;
  customer?: User;
  organizer?: User;
  ticketName?: string;
};

/**
 * Récupère les détails complets d'une vente (admin seulement)
 */
export async function getAdminSaleDetails(saleId: string): Promise<SaleDetails | null> {
  try {
    console.log('[SALE DETAILS] 📋 Fetching sale details for:', saleId);
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      console.log('[SALE DETAILS] ❌ Not authenticated');
      return null;
    }

    // TODO: Vérifier que c'est un admin
    
    // Récupérer la vente
    const saleDoc = await firestore.collection('sales').doc(saleId).get();
    
    if (!saleDoc.exists) {
      console.log('[SALE DETAILS] ❌ Sale not found');
      return null;
    }

    const sale = {
      id: saleDoc.id,
      ...saleDoc.data()
    } as Sale;

    // Récupérer l'événement associé
    let event: Event | undefined;
    try {
      const eventDoc = await firestore.collection('events').doc(sale.eventId).get();
      if (eventDoc.exists) {
        event = {
          id: eventDoc.id,
          ...eventDoc.data()
        } as Event;
      }
    } catch (error) {
      console.error('[SALE DETAILS] ⚠️ Error fetching event:', error);
    }

    // Récupérer le nom du billet depuis l'événement
    let ticketName: string | undefined;
    if (event && event.tickets) {
      const ticket = event.tickets.find(t => t.id === sale.ticketId);
      ticketName = ticket?.name;
    }

    // Récupérer l'organisateur
    let organizer: User | undefined;
    try {
      const organizerDoc = await firestore.collection('users').doc(sale.organizerId).get();
      if (organizerDoc.exists) {
        organizer = {
          id: organizerDoc.id,
          ...organizerDoc.data()
        } as User;
      }
    } catch (error) {
      console.error('[SALE DETAILS] ⚠️ Error fetching organizer:', error);
    }

    // Essayer de trouver le client dans la collection users
    let customer: User | undefined;
    try {
      const usersSnapshot = await firestore
        .collection('users')
        .where('email', '==', sale.customerEmail)
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        customer = {
          id: userDoc.id,
          ...userDoc.data()
        } as User;
      }
    } catch (error) {
      console.error('[SALE DETAILS] ⚠️ Error fetching customer:', error);
    }

    const saleDetails: SaleDetails = {
      ...sale,
      event,
      customer,
      organizer,
      ticketName
    };

    console.log('[SALE DETAILS] ✅ Sale details fetched successfully');
    return saleDetails;

  } catch (error) {
    console.error('[SALE DETAILS] ❌ Error:', error);
    return null;
  }
}

/**
 * Récupère les détails d'une vente pour un organisateur
 */
export async function getOrganizerSaleDetails(saleId: string): Promise<SaleDetails | null> {
  try {
    console.log('[ORGANIZER SALE DETAILS] 📋 Fetching sale details for:', saleId);
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      console.log('[ORGANIZER SALE DETAILS] ❌ Not authenticated');
      return null;
    }

    // Récupérer la vente
    const saleDoc = await firestore.collection('sales').doc(saleId).get();
    
    if (!saleDoc.exists) {
      console.log('[ORGANIZER SALE DETAILS] ❌ Sale not found');
      return null;
    }

    const sale = {
      id: saleDoc.id,
      ...saleDoc.data()
    } as Sale;

    // Vérifier que l'organisateur est le propriétaire
    if (sale.organizerId !== session.user.id) {
      console.log('[ORGANIZER SALE DETAILS] ❌ Not authorized');
      return null;
    }

    // Récupérer l'événement associé
    let event: Event | undefined;
    try {
      const eventDoc = await firestore.collection('events').doc(sale.eventId).get();
      if (eventDoc.exists) {
        event = {
          id: eventDoc.id,
          ...eventDoc.data()
        } as Event;
      }
    } catch (error) {
      console.error('[ORGANIZER SALE DETAILS] ⚠️ Error fetching event:', error);
    }

    // Récupérer le nom du billet
    let ticketName: string | undefined;
    if (event && event.tickets) {
      const ticket = event.tickets.find(t => t.id === sale.ticketId);
      ticketName = ticket?.name;
    }

    const saleDetails: SaleDetails = {
      ...sale,
      event,
      ticketName
    };

    console.log('[ORGANIZER SALE DETAILS] ✅ Sale details fetched successfully');
    return saleDetails;

  } catch (error) {
    console.error('[ORGANIZER SALE DETAILS] ❌ Error:', error);
    return null;
  }
}