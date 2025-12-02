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
    eventId: string;
    ticketId: string;
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
  scannedByName: string;
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
    console.log('[SCAN TICKET] QR Data received:', qrData);

    // Vérifier la session
    console.log('[SCAN TICKET] 🔐 Checking authentication...');
    const session = await auth();
    console.log('[SCAN TICKET] Session user ID:', session?.user?.id);

    if (!session?.user?.id) {
      console.log('[SCAN TICKET] ❌ Not authenticated');
      return { success: false, error: 'Non authentifié' };
    }
    console.log('[SCAN TICKET] ✅ User authenticated:', session.user.email);

    // Parser les données du QR code ou utiliser l'ID de vente directement
    let parsedData: {
      saleId: string;
      eventId: string;
      ticketId: string;
      quantity: number;
      holder: string;
    };

    // Vérifier si c'est un JSON ou juste un ID (de vente ou de billet)
    if (qrData.trim().startsWith('{')) {
      // Format JSON complet
      try {
        console.log('[SCAN TICKET] 🔍 Parsing JSON QR data...');
        parsedData = JSON.parse(qrData);
        console.log('[SCAN TICKET] ✅ Parsed JSON data:', parsedData);
      } catch (e) {
        console.log('[SCAN TICKET] ❌ Failed to parse JSON:', e);
        return { success: false, error: 'QR code invalide' };
      }
    } else {
      // Format ID simple - peut être un ID de vente (ORD-...) ou un numéro de billet (TKT-...)
      const inputId = qrData.trim();
      console.log('[SCAN TICKET] 🔍 Using ID format, fetching from database...', inputId);

      let saleDoc;
      let saleId: string;

      // Vérifier si c'est un numéro de billet (TKT-...)
      if (inputId.startsWith('TKT-')) {
        console.log('[SCAN TICKET] 🎫 Detected ticket number, searching by ticketNumber field...');

        // Chercher par ticketNumber
        const querySnapshot = await firestore
          .collection('sales')
          .where('ticketNumber', '==', inputId)
          .limit(1)
          .get();

        if (querySnapshot.empty) {
          console.log('[SCAN TICKET] ❌ No sale found with ticket number:', inputId);
          return { success: false, error: 'Numéro de billet introuvable' };
        }

        saleDoc = querySnapshot.docs[0];
        saleId = saleDoc.id;
        console.log('[SCAN TICKET] ✅ Found sale with ticketNumber:', saleId);
      } else {
        // Sinon, traiter comme un ID de vente (ORD-... ou ancien format)
        console.log('[SCAN TICKET] 📋 Detected order ID, searching by document ID...');
        saleDoc = await firestore
          .collection('sales')
          .doc(inputId)
          .get();

        if (!saleDoc.exists) {
          console.log('[SCAN TICKET] ❌ Sale not found with ID:', inputId);
          return { success: false, error: 'ID de commande introuvable' };
        }

        saleId = inputId;
      }

      const saleData = saleDoc.data();
      if (!saleData) {
        console.log('[SCAN TICKET] ❌ Sale data is invalid');
        return { success: false, error: 'Données de vente invalides' };
      }

      console.log('[SCAN TICKET] ✅ Sale found:', saleData);

      parsedData = {
        saleId: saleId,
        eventId: saleData.eventId,
        ticketId: saleData.ticketId,
        quantity: saleData.quantity,
        holder: saleData.customerName,
      };
      console.log('[SCAN TICKET] ✅ Constructed data from sale:', parsedData);
    }

    // Si on a reçu un JSON, vérifier que la vente existe
    if (qrData.trim().startsWith('{')) {
      console.log('[SCAN TICKET] 🔍 Verifying sale exists for JSON data:', parsedData.saleId);
      const saleDoc = await firestore
        .collection('sales')
        .doc(parsedData.saleId)
        .get();

      if (!saleDoc.exists) {
        console.log('[SCAN TICKET] ❌ Sale not found');
        return { success: false, error: 'Billet introuvable' };
      }
      console.log('[SCAN TICKET] ✅ Sale verified');
    } else {
      console.log('[SCAN TICKET] ✅ Sale already verified (loaded from database)');
    }

    // Vérifier que l'événement existe
    console.log('[SCAN TICKET] 🔍 Checking if event exists:', parsedData.eventId);
    const eventDoc = await firestore
      .collection('events')
      .doc(parsedData.eventId)
      .get();

    if (!eventDoc.exists) {
      console.log('[SCAN TICKET] ❌ Event not found');
      return { success: false, error: 'Événement introuvable' };
    }

    const event = eventDoc.data();
    console.log('[SCAN TICKET] ✅ Event found:', event?.name);

    // ✅ CORRECTION 1: Vérifier que event existe avant d'accéder à ses propriétés
    if (!event) {
      console.log('[SCAN TICKET] ❌ Event data is invalid');
      return { success: false, error: 'Données événement invalides' };
    }

    // Trouver le ticket
    console.log('[SCAN TICKET] 🔍 Looking for ticket type:', parsedData.ticketId);
    const ticket = event.tickets?.find((t: any) => t.id === parsedData.ticketId);
    if (!ticket) {
      console.log('[SCAN TICKET] ❌ Ticket type not found');
      return { success: false, error: 'Type de billet introuvable' };
    }
    console.log('[SCAN TICKET] ✅ Ticket type found:', ticket.name);

    // Vérifier si l'utilisateur est autorisé à scanner (organisateur de l'événement ou admin)
    console.log('[SCAN TICKET] 🔐 Checking permissions...');
    const isAdmin = await firestore
      .collection('roles_admin')
      .doc(session.user.id)
      .get()
      .then(doc => doc.exists);
    console.log('[SCAN TICKET] Is admin:', isAdmin);

    const isOrganizer = event.organizerId === session.user.id;
    console.log('[SCAN TICKET] Is organizer:', isOrganizer, '(event organizer:', event.organizerId, ', user:', session.user.id, ')');

    if (!isAdmin && !isOrganizer) {
      console.log('[SCAN TICKET] ❌ Not authorized to scan');
      return {
        success: false,
        error: 'Vous n\'êtes pas autorisé à scanner les billets pour cet événement'
      };
    }
    console.log('[SCAN TICKET] ✅ User authorized to scan');

    // Vérifier si le billet a déjà été scanné
    console.log('[SCAN TICKET] 🔍 Checking if ticket already scanned...');
    const existingScanQuery = await firestore
      .collection('ticket_scans')
      .where('saleId', '==', parsedData.saleId)
      .limit(1)
      .get();

    if (!existingScanQuery.empty) {
      const existingScan = existingScanQuery.docs[0].data();
      console.log('[SCAN TICKET] ❌ Ticket already scanned at:', existingScan.scannedAt);
      return {
        success: false,
        error: 'Billet déjà scanné',
        message: `Ce billet a déjà été scanné le ${new Date(existingScan.scannedAt).toLocaleString('fr-FR')}`,
        scanData: {
          eventId: parsedData.eventId,
          ticketId: parsedData.ticketId,
          eventName: event.name,
          ticketName: ticket.name,
          holderName: parsedData.holder,
          quantity: parsedData.quantity,
          scanTime: existingScan.scannedAt,
        },
      };
    }
    console.log('[SCAN TICKET] ✅ Ticket not scanned yet');

    // Enregistrer le scan
    console.log('[SCAN TICKET] 💾 Saving scan to database...');
    const scanTime = new Date().toISOString();
    const scanData = {
      saleId: parsedData.saleId,
      eventId: parsedData.eventId,
      ticketId: parsedData.ticketId,
      scannedBy: session.user.id,
      scannedByName: session.user.name || session.user.email,
      scannedAt: scanTime,
      holderName: parsedData.holder,
      quantity: parsedData.quantity,
    };
    console.log('[SCAN TICKET] Scan data to save:', scanData);

    const docRef = await firestore.collection('ticket_scans').add(scanData);

    console.log('[SCAN TICKET] ✅ Ticket scanned successfully with ID:', docRef.id);
    console.log('[SCAN TICKET] 💾 Document saved in collection: ticket_scans');

    const result = {
      success: true,
      message: 'Billet validé avec succès',
      scanData: {
        eventId: parsedData.eventId,
        ticketId: parsedData.ticketId,
        eventName: event.name,
        ticketName: ticket.name,
        holderName: parsedData.holder,
        quantity: parsedData.quantity,
        scanTime,
      },
    };
    console.log('[SCAN TICKET] Returning result:', result);

    return result;

  } catch (error) {
    console.error('[SCAN TICKET] ❌ Error:', error);
    console.error('[SCAN TICKET] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
    console.log('[GET SCANS] 🔍 Querying ticket_scans collection...');
    console.log('[GET SCANS] Query: eventId ==', eventId);

    let scansSnapshot;
    try {
      // Essayer avec orderBy (nécessite un index)
      scansSnapshot = await firestore
        .collection('ticket_scans')
        .where('eventId', '==', eventId)
        .orderBy('scannedAt', 'desc')
        .get();
      console.log('[GET SCANS] ✅ Query with orderBy succeeded');
    } catch (indexError) {
      // Si l'index manque, essayer sans orderBy
      console.warn('[GET SCANS] ⚠️ Query with orderBy failed, trying without orderBy...');
      console.warn('[GET SCANS] Error:', indexError instanceof Error ? indexError.message : 'Unknown error');

      scansSnapshot = await firestore
        .collection('ticket_scans')
        .where('eventId', '==', eventId)
        .get();
      console.log('[GET SCANS] ✅ Query without orderBy succeeded');
    }

    console.log('[GET SCANS] Query executed, docs returned:', scansSnapshot.docs.length);

    let scans = scansSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('[GET SCANS] Scan doc:', doc.id, data);
      return {
        id: doc.id,
        ...data
      };
    }) as TicketScan[];

    // Trier par date si pas déjà trié (quand index manque)
    scans = scans.sort((a, b) => {
      const dateA = new Date(a.scannedAt).getTime();
      const dateB = new Date(b.scannedAt).getTime();
      return dateB - dateA; // Plus récent d'abord
    });

    console.log(`[GET SCANS] ✅ Found ${scans.length} scans (sorted)`);
    return scans;

  } catch (error) {
    console.error('[GET SCANS] ❌ Error:', error);
    console.error('[GET SCANS] Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('[GET SCANS] Error stack:', error instanceof Error ? error.stack : 'No stack');

    // Si c'est une erreur d'index Firestore, le message le dira
    if (error instanceof Error && error.message.includes('index')) {
      console.error('[GET SCANS] 🔥 FIRESTORE INDEX MISSING! Create the index in Firebase Console');
      console.error('[GET SCANS] Index needed: ticket_scans collection, fields: eventId (ASC), scannedAt (DESC)');
    }

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
    console.log('[SCAN STATS] 📊 Computing stats for event:', eventId);
    const scans = await getEventScans(eventId);

    console.log('[SCAN STATS] Got', scans.length, 'scans from getEventScans');

    const totalScans = scans.length;
    const totalAttendees = scans.reduce((sum, scan) => sum + scan.quantity, 0);

    const scansByTicketType: Record<string, number> = {};
    scans.forEach(scan => {
      if (!scansByTicketType[scan.ticketId]) {
        scansByTicketType[scan.ticketId] = 0;
      }
      scansByTicketType[scan.ticketId] += scan.quantity;
    });

    const stats = {
      totalScans,
      totalAttendees,
      scansByTicketType,
    };

    console.log('[SCAN STATS] ✅ Computed stats:', stats);
    return stats;

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