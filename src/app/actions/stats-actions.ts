'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type { Sale, Event, Organizer } from '@/lib/types';

// ==================== TYPES ====================

export type OrganizerStats = {
  totalSales: number;
  totalRevenue: number;
  totalTicketsSold: number;
  totalEvents: number;
  salesByMonth: Array<{ month: string; sales: number; revenue: number }>;
  topEvents: Array<{ eventId: string; eventName: string; sales: number; revenue: number }>;
  recentSales: Sale[];
};

export type AdminStats = {
  totalSales: number;
  totalRevenue: number;
  totalTicketsSold: number;
  totalEvents: number;
  totalOrganizers: number;
  totalCustomers: number;
  salesByMonth: Array<{ month: string; sales: number; revenue: number }>;
  topEvents: Array<{ eventId: string; eventName: string; sales: number; revenue: number }>;
  topOrganizers: Array<{ organizerId: string; organizerName: string; sales: number; revenue: number }>;
  recentSales: Sale[];
};

// ==================== HELPERS ====================

function getMonthName(date: Date): string {
  return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });
}

function getLast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getMonthName(date));
  }
  
  return months;
}

// ==================== ACTIONS ====================

/**
 * Récupère les statistiques pour un organisateur
 */
export async function getOrganizerStats(): Promise<OrganizerStats | null> {
  try {
    console.log('[ORGANIZER STATS] 📊 Fetching stats...');
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      console.log('[ORGANIZER STATS] ❌ Not authenticated');
      return null;
    }

    const organizerId = session.user.id;

    // Récupérer toutes les ventes de l'organisateur
    const salesSnapshot = await firestore
      .collection('sales')
      .where('organizerId', '==', organizerId)
      .get();

    const sales: Sale[] = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Sale[];

    // Récupérer tous les événements de l'organisateur
    const eventsSnapshot = await firestore
      .collection('events')
      .where('organizerId', '==', organizerId)
      .get();

    const events: Event[] = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Event[];

    // Calculer les statistiques globales
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const totalTicketsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalEvents = events.length;

    // Ventes par mois (6 derniers mois)
    const last6Months = getLast6Months();
    const salesByMonth = last6Months.map(month => {
      const monthSales = sales.filter(sale => {
        const saleMonth = getMonthName(new Date(sale.purchaseDate));
        return saleMonth === month;
      });

      return {
        month,
        sales: monthSales.length,
        revenue: monthSales.reduce((sum, sale) => sum + sale.totalPrice, 0),
      };
    });

    // Top 5 événements par ventes
    const eventSalesMap = new Map<string, { sales: number; revenue: number }>();
    
    sales.forEach(sale => {
      const current = eventSalesMap.get(sale.eventId) || { sales: 0, revenue: 0 };
      eventSalesMap.set(sale.eventId, {
        sales: current.sales + 1,
        revenue: current.revenue + sale.totalPrice,
      });
    });

    const topEvents = Array.from(eventSalesMap.entries())
      .map(([eventId, data]) => {
        const event = events.find(e => e.id === eventId);
        return {
          eventId,
          eventName: event?.name || 'Événement inconnu',
          sales: data.sales,
          revenue: data.revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 10 ventes les plus récentes
    const recentSales = sales
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      .slice(0, 10);

    console.log('[ORGANIZER STATS] ✅ Stats fetched successfully');

    return {
      totalSales,
      totalRevenue,
      totalTicketsSold,
      totalEvents,
      salesByMonth,
      topEvents,
      recentSales,
    };

  } catch (error) {
    console.error('[ORGANIZER STATS] ❌ Error:', error);
    return null;
  }
}

/**
 * Récupère les statistiques globales pour l'admin
 */
export async function getAdminStats(): Promise<AdminStats | null> {
  try {
    console.log('[ADMIN STATS] 📊 Fetching global stats...');
    
    // Vérifier la session (TODO: vérifier que c'est un admin)
    const session = await auth();
    if (!session?.user?.id) {
      console.log('[ADMIN STATS] ❌ Not authenticated');
      return null;
    }

    // Récupérer toutes les ventes
    const salesSnapshot = await firestore.collection('sales').get();
    const sales: Sale[] = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Sale[];

    // Récupérer tous les événements
    const eventsSnapshot = await firestore.collection('events').get();
    const events: Event[] = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Event[];

    // Récupérer tous les organisateurs
    const organizersSnapshot = await firestore.collection('organizers').get();
    const totalOrganizers = organizersSnapshot.size;

    // Récupérer tous les clients
    const usersSnapshot = await firestore
      .collection('users')
      .where('role', '==', 'customer')
      .get();
    const totalCustomers = usersSnapshot.size;

    // Statistiques globales
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const totalTicketsSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalEvents = events.length;

    // Ventes par mois
    const last6Months = getLast6Months();
    const salesByMonth = last6Months.map(month => {
      const monthSales = sales.filter(sale => {
        const saleMonth = getMonthName(new Date(sale.purchaseDate));
        return saleMonth === month;
      });

      return {
        month,
        sales: monthSales.length,
        revenue: monthSales.reduce((sum, sale) => sum + sale.totalPrice, 0),
      };
    });

    // Top événements
    const eventSalesMap = new Map<string, { sales: number; revenue: number }>();
    
    sales.forEach(sale => {
      const current = eventSalesMap.get(sale.eventId) || { sales: 0, revenue: 0 };
      eventSalesMap.set(sale.eventId, {
        sales: current.sales + 1,
        revenue: current.revenue + sale.totalPrice,
      });
    });

    const topEvents = Array.from(eventSalesMap.entries())
      .map(([eventId, data]) => {
        const event = events.find(e => e.id === eventId);
        return {
          eventId,
          eventName: event?.name || 'Événement inconnu',
          sales: data.sales,
          revenue: data.revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top organisateurs
    const organizerSalesMap = new Map<string, { sales: number; revenue: number }>();
    
    sales.forEach(sale => {
      const current = organizerSalesMap.get(sale.organizerId) || { sales: 0, revenue: 0 };
      organizerSalesMap.set(sale.organizerId, {
        sales: current.sales + 1,
        revenue: current.revenue + sale.totalPrice,
      });
    });

    const organizersData: Organizer[] = organizersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Organizer));

    const topOrganizers = Array.from(organizerSalesMap.entries())
      .map(([organizerId, data]) => {
        const organizer = organizersData.find((o) => o.id === organizerId);
        return {
          organizerId,
          organizerName: organizer?.name || 'Organisateur inconnu',
          sales: data.sales,
          revenue: data.revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Ventes récentes
    const recentSales = sales
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      .slice(0, 10);

    console.log('[ADMIN STATS] ✅ Stats fetched successfully');

    return {
      totalSales,
      totalRevenue,
      totalTicketsSold,
      totalEvents,
      totalOrganizers,
      totalCustomers,
      salesByMonth,
      topEvents,
      topOrganizers,
      recentSales,
    };

  } catch (error) {
    console.error('[ADMIN STATS] ❌ Error:', error);
    return null;
  }
}