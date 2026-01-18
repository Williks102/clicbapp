'use server';

import { Resend } from 'resend';
import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type {
  Event,
  Sale,
  PurchaseData,
  PurchaseResult,
  TicketTier,
  User,
} from '@/lib/types';

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = 'admin@clicbillet.com';

// ==================== HELPERS ====================

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

function generateTicketNumber(orderId: string): string {
  const parts = orderId.split('-');
  const uniquePart =
    parts[parts.length - 1] || parts[1] || orderId.substring(4, 12);
  return `TKT-${uniquePart}`;
}

function generateTicketQRData(
  sale: Sale,
  event: Event,
  ticketNumber: string
): string {
  return JSON.stringify({
    ticketNumber: ticketNumber, // Le numéro de billet unique
    saleId: sale.id, // La référence de la commande
    eventId: sale.eventId,
    ticketId: sale.ticketId, // Le type de billet
    quantity: 1, // Ce QR code est valable pour 1 personne
    holder: sale.customerName,
    purchaseDate: sale.purchaseDate,
    eventName: event.name,
  });
}

function generateQRCodeURL(data: string): string {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
}

// ==================== ACTIONS ====================

export async function createPurchaseAndSendTicket(
  data: PurchaseData
): Promise<PurchaseResult> {
  try {
    console.log('[PURCHASE] 🎫 Creating purchase...');
    const session = await auth();

    const eventRef = firestore.collection('events').doc(data.eventId);
    const orderId = generateOrderNumber();
    let event: Event | null = null;
    let ticket: TicketTier | null = null;
    let sale: Sale | null = null;

    // Utiliser une transaction pour garantir l'atomicité
    await firestore.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists) {
        throw new Error('Événement introuvable');
      }

      const currentEvent = { id: eventDoc.id, ...eventDoc.data() } as Event;
      event = currentEvent; // Assigner pour l'envoi d'email hors de la transaction

      const ticketIndex = currentEvent.tickets.findIndex(
        (t) => t.id === data.ticketId
      );
      if (ticketIndex === -1) {
        throw new Error('Type de billet introuvable');
      }

      const currentTicket = currentEvent.tickets[ticketIndex];
      ticket = currentTicket; // Assigner pour l'envoi d'email

      if (currentTicket.quantity < data.quantity) {
        throw new Error('Quantité de billets insuffisante');
      }

      // Préparer le tableau des billets mis à jour
      const updatedTickets = [...currentEvent.tickets];
      updatedTickets[ticketIndex] = {
        ...currentTicket,
        quantity: currentTicket.quantity - data.quantity,
      };

      // Mettre à jour le document de l'événement avec la nouvelle quantité
      transaction.update(eventRef, { tickets: updatedTickets });
      console.log(
        `[PURCHASE] 🔄 Updated ticket quantity for event ${data.eventId}`
      );

      // Créer le document de vente
      const saleRef = firestore.collection('sales').doc(orderId);
      const mainTicketNumber = generateTicketNumber(orderId);
      const purchaseDate = new Date().toISOString();

      const newSale: Sale = {
        id: orderId,
        ticketNumber: mainTicketNumber,
        eventId: data.eventId,
        ticketId: data.ticketId,
        customerName: data.fullName,
        customerEmail: data.email,
        quantity: data.quantity,
        totalPrice: data.totalPrice,
        purchaseDate,
        organizerId: currentEvent.organizerId,
      };

      sale = newSale; // Assigner pour l'envoi d'email

      transaction.set(saleRef, newSale);
      console.log(
        '[PURCHASE] ✅ Sale created in Firestore within transaction:',
        orderId
      );
    });

    if (!event || !ticket || !sale) {
      throw new Error(
        "La transaction a échoué, les données n'ont pas été préparées."
      );
    }

    // --- Envoi des emails (en dehors de la transaction) ---
    const ticketsForEmail: { ticketNumber: string; qrCodeURL: string }[] = [];
    for (let i = 1; i <= sale.quantity; i++) {
      const uniqueTicketNumber = `${sale.id}-I${i}`;
      const qrData = generateTicketQRData(sale, event, uniqueTicketNumber);
      const qrCodeURL = generateQRCodeURL(qrData);
      ticketsForEmail.push({ ticketNumber: uniqueTicketNumber, qrCodeURL });
    }

    try {
      await sendCustomerTicketEmail({
        to: data.email,
        customerName: data.fullName,
        event,
        ticket,
        sale,
        tickets: ticketsForEmail,
      });
      console.log(
        '[PURCHASE] ✅ Customer email sent with',
        ticketsForEmail.length,
        'tickets.'
      );
    } catch (emailError) {
      console.error('[PURCHASE] ⚠️ Customer email failed:', emailError);
    }

    try {
      const organizerDoc = await firestore
        .collection('users')
        .doc(event.organizerId)
        .get();
      if (organizerDoc.exists) {
        const organizer = organizerDoc.data() as User;
        await sendOrganizerNotificationEmail({
          sale,
          event,
          ticketName: ticket.name,
          organizerEmail: organizer.email,
        });
        console.log('[PURCHASE] ✅ Organizer notification sent');
      }
    } catch (orgError) {
      console.error('[PURCHASE] ⚠️ Organizer notification failed:', orgError);
    }

    if (ADMIN_EMAIL) {
      try {
        const organizerName =
          (await firestore.collection('users').doc(event.organizerId).get())
            .data()?.name || 'Inconnu';
        await sendAdminNotificationEmail({
          sale,
          event,
          ticketName: ticket.name,
          organizerName,
        });
        console.log('[PURCHASE] ✅ Admin notification sent');
      } catch (adminError) {
        console.error('[PURCHASE] ⚠️ Admin notification failed:', adminError);
      }
    }

    return {
      success: true,
      saleId: orderId,
      message: 'Achat confirmé ! Vérifiez votre email pour vos billets.',
    };
  } catch (error: any) {
    console.error('[PURCHASE] ❌ Fatal error:', error);
    return {
      success: false,
      error: error.message || "Une erreur est survenue lors de l'achat",
    };
  }
}

// ==================== EMAIL TEMPLATES ====================

// --- Email pour le client ---
type CustomerEmailData = {
  to: string;
  customerName: string;
  event: Event;
  ticket: TicketTier;
  sale: Sale;
  tickets: { ticketNumber: string; qrCodeURL: string }[];
};

async function sendCustomerTicketEmail(data: CustomerEmailData) {
  const { to, customerName, event, ticket, sale, tickets } = data;
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });

  // Générer le HTML pour chaque billet
  const ticketsHtml = tickets.map((ticketData, index) => `
    <div class="ticket-card" style="page-break-inside: avoid; margin-bottom: 20px;">
      <h3 class="ticket-header">Billet ${index + 1} / ${tickets.length}</h3>
      <div class="event-name">${event.name}</div>
      <div class="info-row"><span>🎫 Billet</span><span>${ticket.name}</span></div>
      <div class="info-row"><span>👤 Détenteur</span><span>${customerName}</span></div>
      <div class="info-row"><span>🔢 N° Billet</span><span style="font-family: monospace;">${ticketData.ticketNumber}</span></div>
      <div class="qr-section">
        <h3>Votre QR Code d'Entrée</h3>
        <p>Présentez ce code à l'entrée</p>
        <img src="${ticketData.qrCodeURL}" alt="QR Code pour le billet ${ticketData.ticketNumber}" />
      </div>
    </div>
  `).join('');

  await resend.emails.send({
    from: 'ClicBillet <contact@monticket.online>',
    to,
    subject: `🎫 Vos ${sale.quantity} billets pour ${event.name}`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; }
        .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f7f7f7; padding: 20px; }
        .ticket-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; }
        .event-name { font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 15px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .qr-section { text-align: center; padding: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .summary-card { background: #fff; border-radius: 10px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0e0;}
        .ticket-header { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 15px; text-align: center; background: #eee; padding: 5px; border-radius: 5px;}
      </style>
    </head>
    <body>
      <div class="header"><h1>ClicBillet</h1><p>Votre confirmation de commande</p></div>
      <div class="content">
        <p>Bonjour ${customerName},</p>
        <p>Merci pour votre achat ! Voici vos <strong>${sale.quantity} billets</strong> pour l'événement :</p>
        
        <div class="summary-card">
          <div class="event-name">${event.name}</div>
          <div class="info-row"><span>📅 Date</span><span>${formattedDate} à ${formattedTime}</span></div>
          <div class="info-row"><span>📍 Lieu</span><span>${event.location}</span></div>
          <div class="info-row"><span>N° Commande</span><span style="font-family: monospace;">${sale.id}</span></div>
          <div class="info-row"><strong>Total Payé</strong><strong>${sale.totalPrice.toLocaleString('fr-FR')} F CFA</strong></div>
        </div>

        <h2 style="text-align: center; margin-top: 30px;">Vos Billets Individuels</h2>
        ${ticketsHtml}

        <p>À bientôt !<br><strong>L'équipe ClicBillet</strong></p>
      </div>
      <div class="footer"><p>© ${new Date().getFullYear()} ClicBillet</p></div>
    </body>
    </html>
    `,
  });
}


// --- Email pour l'organisateur ---
type OrganizerEmailData = {
  sale: Sale;
  event: Event;
  ticketName: string;
  organizerEmail: string;
};

async function sendOrganizerNotificationEmail(data: OrganizerEmailData) {
  const { sale, event, ticketName, organizerEmail } = data;
  await resend.emails.send({
    from: 'ClicBillet Ventes <ventes@monticket.online>',
    to: organizerEmail,
    subject: `🎉 Nouvelle vente pour votre événement : ${event.name}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Nouvelle Vente !</h2>
        <p>Bonne nouvelle ! Une nouvelle vente vient d'être effectuée pour votre événement <strong>${event.name}</strong>.</p>
        <h3>Détails de la vente :</h3>
        <ul>
          <li><strong>Client :</strong> ${sale.customerName}</li>
          <li><strong>Email :</strong> ${sale.customerEmail}</li>
          <li><strong>Billet :</strong> ${ticketName}</li>
          <li><strong>Quantité :</strong> ${sale.quantity}</li>
          <li><strong>Montant Total :</strong> ${sale.totalPrice.toLocaleString('fr-FR')} F CFA</li>
          <li><strong>Date :</strong> ${new Date(sale.purchaseDate).toLocaleString('fr-FR')}</li>
        </ul>
        <p>Vous pouvez consulter les détails complets dans votre tableau de bord.</p>
        <p>L'équipe ClicBillet</p>
      </div>
    `,
  });
}

// --- Email pour l'administrateur ---
type AdminEmailData = {
  sale: Sale;
  event: Event;
  ticketName: string;
  organizerName: string;
};

async function sendAdminNotificationEmail(data: AdminEmailData) {
  const { sale, event, ticketName, organizerName } = data;
  await resend.emails.send({
    from: 'ClicBillet Admin <noreply@monticket.online>',
    to: ADMIN_EMAIL,
    subject: `[ADMIN] Nouvelle Vente sur ClicBillet : #${sale.id.slice(-6)}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ccc;">
        <h2>Notification de Vente (Admin)</h2>
        <p>Une vente a été enregistrée sur la plateforme.</p>
        <hr>
        <h3>Résumé :</h3>
        <ul>
          <li><strong>ID Vente :</strong> ${sale.id}</li>
          <li><strong>Organisateur :</strong> ${organizerName} (ID: ${sale.organizerId})</li>
          <li><strong>Événement :</strong> ${event.name} (ID: ${sale.eventId})</li>
          <li><strong>Client :</strong> ${sale.customerName} (${sale.customerEmail})</li>
          <li><strong>Billet :</strong> ${ticketName} (x${sale.quantity})</li>
          <li><strong>Montant Total :</strong> <strong>${sale.totalPrice.toLocaleString('fr-FR')} F CFA</strong></li>
          <li><strong>Date :</strong> ${new Date(sale.purchaseDate).toLocaleString('fr-FR')}</li>
        </ul>
      </div>
    `,
  });
}

// --- Action pour renvoyer le billet ---
export async function resendTicketEmail(saleId: string): Promise<PurchaseResult> {
  try {
    console.log('[RESEND] 📧 Resending ticket...');

    const saleDoc = await firestore.collection('sales').doc(saleId).get();
    if (!saleDoc.exists) return { success: false, error: 'Commande introuvable' };
    const sale = { id: saleDoc.id, ...saleDoc.data() } as Sale;

    const eventDoc = await firestore.collection('events').doc(sale.eventId).get();
    if (!eventDoc.exists) return { success: false, error: 'Événement introuvable' };
    const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

    const ticket = event.tickets.find(t => t.id === sale.ticketId);
    if (!ticket) return { success: false, error: 'Type de billet introuvable' };

    // Régénérer les données pour chaque billet individuel
    const ticketsForEmail: { ticketNumber: string; qrCodeURL: string }[] = [];
    for (let i = 1; i <= sale.quantity; i++) {
        const uniqueTicketNumber = `${sale.id}-I${i}`;
        const qrData = generateTicketQRData(sale, event, uniqueTicketNumber);
        const qrCodeURL = generateQRCodeURL(qrData);
        ticketsForEmail.push({ ticketNumber: uniqueTicketNumber, qrCodeURL });
    }

    await sendCustomerTicketEmail({
      to: sale.customerEmail,
      customerName: sale.customerName,
      event,
      ticket,
      sale,
      tickets: ticketsForEmail,
    });

    console.log('[RESEND] ✅ Email resent successfully');

    return {
      success: true,
      message: 'Billet renvoyé avec succès',
    };

  } catch (error: any) {
    console.error('[RESEND] ❌ Error:', error);
    return {
      success: false,
      error: 'Erreur lors du renvoi du billet',
    };
  }
}
