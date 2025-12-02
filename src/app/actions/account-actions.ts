'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type { Sale, Event, TicketTier } from '@/lib/types';

// Type pour un billet enrichi avec les infos de l'événement
export type EnrichedTicket = {
  sale: Sale;
  event: Event | null;
  ticketTier: TicketTier | null;
  ticketNumber: string;
};

/**
 * Récupère tous les billets achetés par l'utilisateur connecté
 */
export async function getUserTickets(): Promise<{
  success: boolean;
  tickets?: EnrichedTicket[];
  error?: string;
}> {
  try {
    console.log('[GET USER TICKETS] 🎫 Starting...');

    // 1. Vérifier la session
    const session = await auth();
    if (!session?.user?.email) {
      return {
        success: false,
        error: 'Vous devez être connecté pour voir vos billets.',
      };
    }

    console.log('[GET USER TICKETS] ✅ User authenticated:', session.user.email);

    // 2. Récupérer les ventes de l'utilisateur par email
    const salesSnapshot = await firestore
      .collection('sales')
      .where('customerEmail', '==', session.user.email)
      .orderBy('purchaseDate', 'desc')
      .get();

    console.log('[GET USER TICKETS] 📊 Found', salesSnapshot.size, 'sales');

    if (salesSnapshot.empty) {
      return {
        success: true,
        tickets: [],
      };
    }

    // 3. Récupérer les IDs d'événements uniques
    const sales = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Sale[];

    const eventIds = [...new Set(sales.map(sale => sale.eventId))];

    // 4. Récupérer tous les événements en une seule requête
    const eventsMap = new Map<string, Event>();
    
    // Firestore limite les requêtes "in" à 30 éléments
    const chunks = [];
    for (let i = 0; i < eventIds.length; i += 30) {
      chunks.push(eventIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const eventsSnapshot = await firestore
        .collection('events')
        .where('__name__', 'in', chunk)
        .get();

      eventsSnapshot.docs.forEach(doc => {
        eventsMap.set(doc.id, { id: doc.id, ...doc.data() } as Event);
      });
    }

    console.log('[GET USER TICKETS] 🎪 Loaded', eventsMap.size, 'events');

    // 5. Enrichir les billets avec les données des événements
    const enrichedTickets: EnrichedTicket[] = sales.map(sale => {
      const event = eventsMap.get(sale.eventId) || null;
      const ticketTier = event?.tickets.find(t => t.id === sale.ticketId) || null;

      // ✅ Utiliser le ticketNumber stocké, sinon le générer (pour les anciennes ventes)
      const ticketNumber = sale.ticketNumber || `TKT-${sale.id.split('-')[1] || sale.id.substring(0, 8)}`;

      return {
        sale,
        event,
        ticketTier,
        ticketNumber,
      };
    });

    console.log('[GET USER TICKETS] ✅ Success - returning', enrichedTickets.length, 'tickets');

    return {
      success: true,
      tickets: enrichedTickets,
    };

  } catch (error) {
    console.error('[GET USER TICKETS] ❌ Error:', error);
    return {
      success: false,
      error: 'Une erreur est survenue lors de la récupération de vos billets.',
    };
  }
}