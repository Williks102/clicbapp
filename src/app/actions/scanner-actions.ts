
'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { Sale } from '@/lib/types';

// ==================== TYPES ====================

export type ScanResult = {
  success: boolean;
  error?: string;
  message?: string;
  scanData?: {
    eventId: string;
    ticketId: string; // Type de billet
    ticketNumber: string; // Numéro unique du billet
    eventName: string;
    ticketName: string;
    holderName: string;
    quantity: number; // Sera toujours 1 pour un scan unique
    scanTime: string;
  };
};

export type TicketScan = {
  id: string;
  saleId: string;
  ticketNumber: string; // Identifiant unique du billet
  eventId: string;
  ticketId: string; // Type de billet
  scannedBy: string;
  scannedByName: string;
  scannedAt: string;
  holderName: string;
  quantity: number; // Sera toujours 1
};

// ==================== ACTIONS ====================

/**
 * Valide et enregistre un scan de billet
 */
export async function validateAndScanTicket(
  qrData: string
): Promise<ScanResult> {
  const startTime = Date.now();
  try {
    console.log('==================== SCAN TICKET START ====================');
    console.log('[SCAN TICKET] QR Data received:', qrData);

    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }
    console.log('[SCAN TICKET] ✅ User authenticated:', session.user.email);

    let parsedQrData: {
      ticketNumber: string;
      saleId: string;
      eventId: string;
      ticketId: string;
      holder: string;
    };

    // Parser le QR code
    try {
      const data = JSON.parse(qrData);
      if (!data.ticketNumber || !data.saleId || !data.eventId) {
        throw new Error('Données QR invalides');
      }
      parsedQrData = data;
      console.log('[SCAN TICKET] ✅ Parsed QR data:', parsedQrData);
    } catch (e) {
      console.error('[SCAN TICKET] ❌ Failed to parse JSON:', qrData);
      // Logique pour les anciens formats ou saisie manuelle
      const sale = await findSaleByTicketNumber(qrData.trim());
      if (!sale) {
        return { success: false, error: 'Code QR ou numéro de billet invalide' };
      }
      parsedQrData = {
        ticketNumber: qrData.trim(),
        saleId: sale.id,
        eventId: sale.eventId,
        ticketId: sale.ticketId,
        holder: sale.customerName,
      };
    }
    
    const { ticketNumber, saleId, eventId, ticketId, holder } = parsedQrData;

    // Vérifier si le billet a déjà été scanné
    console.log('[SCAN TICKET] 🔍 Checking for existing scan for ticketNumber:', ticketNumber);
    const existingScanQuery = await firestore
      .collection('ticket_scans')
      .where('ticketNumber', '==', ticketNumber)
      .limit(1)
      .get();

    if (!existingScanQuery.empty) {
      const existingScan = existingScanQuery.docs[0].data();
      console.log('[SCAN TICKET] ❌ Ticket already scanned at:', existingScan.scannedAt);
      return {
        success: false,
        error: 'Billet déjà scanné',
        message: `Ce billet a déjà été validé le ${new Date(existingScan.scannedAt).toLocaleString('fr-FR')}`,
        scanData: {
          eventId,
          ticketId,
          ticketNumber,
          eventName: 'N/A', // Sera rempli plus tard
          ticketName: 'N/A', // Sera rempli plus tard
          holderName: holder,
          quantity: 1,
          scanTime: existingScan.scannedAt,
        },
      };
    }
    console.log('[SCAN TICKET] ✅ Ticket not scanned yet');

    // Récupérer la vente et l'événement pour validation croisée
    const [saleDoc, eventDoc] = await Promise.all([
      firestore.collection('sales').doc(saleId).get(),
      firestore.collection('events').doc(eventId).get(),
    ]);

    if (!saleDoc.exists) return { success: false, error: 'Commande associée introuvable' };
    if (!eventDoc.exists) return { success: false, error: 'Événement associé introuvable' };

    const event = eventDoc.data();
    if (!event) return { success: false, error: 'Données événement invalides' };

    // Vérifier les permissions
    const isAdminDoc = await firestore.collection('roles_admin').doc(session.user.id).get();
    const isAdmin = isAdminDoc.exists;
    const isOrganizer = event.organizerId === session.user.id;

    if (!isAdmin && !isOrganizer) {
      return { success: false, error: 'Vous n\'êtes pas autorisé à scanner les billets pour cet événement' };
    }
    console.log('[SCAN TICKET] ✅ User authorized to scan');
    
    // Trouver le type de billet
    const ticketTier = event.tickets?.find((t: any) => t.id === ticketId);
    if (!ticketTier) return { success: false, error: 'Type de billet introuvable' };

    // Enregistrer le scan
    const scanTime = new Date().toISOString();
    const scanData = {
      saleId,
      ticketNumber, // Enregistrer le numéro de billet unique
      eventId,
      ticketId,
      scannedBy: session.user.id,
      scannedByName: session.user.name || session.user.email,
      scannedAt: scanTime,
      holderName: holder,
      quantity: 1, // Chaque scan vaut pour une entrée
    };

    await firestore.collection('ticket_scans').add(scanData);
    console.log('[SCAN TICKET] ✅ Ticket scan saved to database');

    return {
      success: true,
      message: 'Billet validé avec succès',
      scanData: {
        eventId,
        ticketId,
        ticketNumber,
        eventName: event.name,
        ticketName: ticketTier.name,
        holderName: holder,
        quantity: 1,
        scanTime,
      },
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('==================== SCAN TICKET ERROR ====================');
    console.error('[SCAN TICKET] ❌ Error:', error);
    return { success: false, error: 'Erreur lors de la validation du billet' };
  }
}

async function findSaleByTicketNumber(ticketNumber: string): Promise<Sale | null> {
  const saleId = ticketNumber.split('-I')[0];
  if (!saleId) return null;

  const saleDoc = await firestore.collection('sales').doc(saleId).get();
  if (!saleDoc.exists) return null;
  
  return { id: saleDoc.id, ...saleDoc.data() } as Sale;
}


/**
 * Récupère l'historique des scans pour un événement
 */
export async function getEventScans(eventId: string): Promise<TicketScan[]> {
  try {
    console.log('[GET SCANS] 📋 Fetching scans for event:', eventId);
    
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const eventDoc = await firestore.collection('events').doc(eventId).get();
    if (!eventDoc.exists) return [];

    const event = eventDoc.data();
    if (!event) return [];
    
    const isAdminDoc = await firestore.collection('roles_admin').doc(session.user.id).get();
    const isAdmin = isAdminDoc.exists;
    const isOrganizer = event.organizerId === session.user.id;

    if (!isAdmin && !isOrganizer) return [];

    const scansSnapshot = await firestore
      .collection('ticket_scans')
      .where('eventId', '==', eventId)
      .orderBy('scannedAt', 'desc')
      .get();

    const scans = scansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TicketScan[];
    
    console.log(`[GET SCANS] ✅ Found ${scans.length} scans`);
    return scans;

  } catch (error) {
    console.error('[GET SCANS] ❌ Error:', error);
    return [];
  }
}

/**
 * Récupère les statistiques de scan pour un événement
 */
export async function getEventScanStats(eventId: string): Promise<{
  totalScans: number;
  totalAttendees: number; // sera égal à totalScans
  scansByTicketType: Record<string, number>;
} | null> {
  try {
    const scans = await getEventScans(eventId);
    const totalScans = scans.length;
    
    const scansByTicketType: Record<string, number> = {};
    scans.forEach(scan => {
      if (!scansByTicketType[scan.ticketId]) {
        scansByTicketType[scan.ticketId] = 0;
      }
      scansByTicketType[scan.ticketId]++;
    });

    return {
      totalScans,
      totalAttendees: totalScans, // Chaque scan est un participant
      scansByTicketType,
    };
  } catch (error) {
    console.error('[SCAN STATS] ❌ Error:', error);
    return null;
  }
}

/**
 * Annule un scan (en cas d'erreur)
 */
export async function cancelScan(scanId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    const scanDoc = await firestore.collection('ticket_scans').doc(scanId).get();
    if (!scanDoc.exists) {
      return { success: false, error: 'Scan introuvable' };
    }
    const scan = scanDoc.data();
    if (!scan) {
      return { success: false, error: 'Données scan invalides' };
    }
    
    const isAdminDoc = await firestore.collection('roles_admin').doc(session.user.id).get();
    const isAdmin = isAdminDoc.exists;
    const isScanner = scan.scannedBy === session.user.id;

    if (!isAdmin && !isScanner) {
      return { success: false, error: 'Non autorisé à annuler ce scan' };
    }

    await firestore.collection('ticket_scans').doc(scanId).delete();
    revalidatePath('/dashboard/scanner');
    revalidatePath('/admin/scanner');

    return { success: true };
  } catch (error) {
    console.error('[CANCEL SCAN] ❌ Error:', error);
    return { success: false, error: 'Erreur lors de l\'annulation' };
  }
}
