'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

// ==================== TYPES ====================

export type ScanResult = {
  success: boolean;
  error?: string;
  message?: string;
  scanData?: {
    eventName: string;
    ticketName: string;
    holderName: string;
    quantity: number;
    scanTime: string;
  };
};

export type TicketScan = {
  id: string;
  saleId: string;
  eventId: string;
  ticketId: string;
  scannedBy: string;
  scannedAt: string;
  holderName: string;
  quantity: number;
};

// ==================== ACTIONS ====================

/**
 * Valide et enregistre un scan de billet
 */
export async function validateAndScanTicket(
  qrData: string
): Promise<ScanResult> {
  try {
    console.log('[SCAN TICKET] 🎫 Validating ticket...');
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    // Parser les données du QR code
    let parsedData: {
      saleId: string;
      eventId: string;
      ticketId: string;
      quantity: number;
      holder: string;
    };

    try {
      parsedData = JSON.parse(qrData);
    } catch (e) {
      return { success: false, error: 'QR code invalide' };
    }

    // Vérifier que la vente existe
    const saleDoc = await firestore
      .collection('sales')
      .doc(parsedData.saleId)
      .get();

    if (!saleDoc.exists) {
      return { success: false, error: 'Billet introuvable' };
    }

    // Vérifier que l'événement existe
    const eventDoc = await firestore
      .collection('events')
      .doc(parsedData.eventId)
      .get();

    if (!eventDoc.exists) {
      return { success: false, error: 'Événement introuvable' };
    }

    const event = eventDoc.data();
    
    // ✅ CORRECTION 1: Vérifier que event existe avant d'accéder à ses propriétés
    if (!event) {
      return { success: false, error: 'Données événement invalides' };
    }

    // Trouver le ticket
    const ticket = event.tickets?.find((t: any) => t.id === parsedData.ticketId);
    if (!ticket) {
      return { success: false, error: 'Type de billet introuvable' };
    }

    // Vérifier si l'utilisateur est autorisé à scanner (organisateur de l'événement ou admin)
    const isAdmin = await firestore
      .collection('roles_admin')
      .doc(session.user.id)
      .get()
      .then(doc => doc.exists);

    const isOrganizer = event.organizerId === session.user.id;

    if (!isAdmin && !isOrganizer) {
      return { 
        success: false, 
        error: 'Vous n\'êtes pas autorisé à scanner les billets pour cet événement' 
      };
    }

    // Vérifier si le billet a déjà été scanné
    const existingScanQuery = await firestore
      .collection('ticket_scans')
      .where('saleId', '==', parsedData.saleId)
      .limit(1)
      .get();

    if (!existingScanQuery.empty) {
      const existingScan = existingScanQuery.docs[0].data();
      return {
        success: false,
        error: 'Billet déjà scanné',
        message: `Ce billet a déjà été scanné le ${new Date(existingScan.scannedAt).toLocaleString('fr-FR')}`,
      };
    }

    // Enregistrer le scan
    const scanTime = new Date().toISOString();
    await firestore.collection('ticket_scans').add({
      saleId: parsedData.saleId,
      eventId: parsedData.eventId,
      ticketId: parsedData.ticketId,
      scannedBy: session.user.id,
      scannedByName: session.user.name || session.user.email,
      scannedAt: scanTime,
      holderName: parsedData.holder,
      quantity: parsedData.quantity,
    });

    console.log('[SCAN TICKET] ✅ Ticket scanned successfully');

    return {
      success: true,
      message: 'Billet validé avec succès',
      scanData: {
        eventName: event.name,
        ticketName: ticket.name,
        holderName: parsedData.holder,
        quantity: parsedData.quantity,
        scanTime,
      },
    };

  } catch (error) {
    console.error('[SCAN TICKET] ❌ Error:', error);
    return { 
      success: false, 
      error: 'Erreur lors de la validation du billet' 
    };
  }
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

    // Vérifier que l'utilisateur a accès à l'événement
    const eventDoc = await firestore.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return [];
    }

    const event = eventDoc.data();
    
    // ✅ CORRECTION 2: Vérifier que event existe
    if (!event) {
      return [];
    }
    
    // Vérifier les permissions
    const isAdmin = await firestore
      .collection('roles_admin')
      .doc(session.user.id)
      .get()
      .then(doc => doc.exists);

    const isOrganizer = event.organizerId === session.user.id;

    if (!isAdmin && !isOrganizer) {
      return [];
    }

    // Récupérer les scans
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
  totalAttendees: number;
  scansByTicketType: Record<string, number>;
} | null> {
  try {
    const scans = await getEventScans(eventId);
    
    const totalScans = scans.length;
    const totalAttendees = scans.reduce((sum, scan) => sum + scan.quantity, 0);
    
    const scansByTicketType: Record<string, number> = {};
    scans.forEach(scan => {
      if (!scansByTicketType[scan.ticketId]) {
        scansByTicketType[scan.ticketId] = 0;
      }
      scansByTicketType[scan.ticketId] += scan.quantity;
    });

    return {
      totalScans,
      totalAttendees,
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
    console.log('[CANCEL SCAN] ❌ Canceling scan:', scanId);
    
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que le scan existe
    const scanDoc = await firestore.collection('ticket_scans').doc(scanId).get();
    if (!scanDoc.exists) {
      return { success: false, error: 'Scan introuvable' };
    }

    const scan = scanDoc.data();
    
    // ✅ CORRECTION 3: Vérifier que scan existe
    if (!scan) {
      return { success: false, error: 'Données scan invalides' };
    }

    // Vérifier les permissions (admin ou celui qui a scanné)
    const isAdmin = await firestore
      .collection('roles_admin')
      .doc(session.user.id)
      .get()
      .then(doc => doc.exists);

    const isScanner = scan.scannedBy === session.user.id;

    if (!isAdmin && !isScanner) {
      return { success: false, error: 'Non autorisé à annuler ce scan' };
    }

    // Supprimer le scan
    await firestore.collection('ticket_scans').doc(scanId).delete();

    console.log('[CANCEL SCAN] ✅ Scan canceled');
    revalidatePath('/dashboard/scanner');
    revalidatePath('/admin/scanner');

    return { success: true };

  } catch (error) {
    console.error('[CANCEL SCAN] ❌ Error:', error);
    return { success: false, error: 'Erreur lors de l\'annulation' };
  }
}