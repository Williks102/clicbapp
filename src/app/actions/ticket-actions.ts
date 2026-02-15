
'use server';

import { Resend } from 'resend';
import { firestore } from '@/lib/firebase-admin';
import type {
  Event,
  Sale,
  PurchaseResult,
  TicketTier,
  User,
} from '@/lib/types';

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = 'admin@clicbillet.com';

// ==================== HELPERS ====================

function generateTicketNumber(orderId: string): string {
  const parts = orderId.split('-');
  const uniquePart = parts[parts.length - 1] || parts[1] || orderId.substring(4, 12);
  return `TKT-${uniquePart}`;
}

function generateTicketQRData(
  sale: Sale,
  event: Event,
  ticketNumber: string
): string {
  return JSON.stringify({
    ticketNumber: ticketNumber,
    saleId: sale.id,
    eventId: sale.eventId,
    ticketId: sale.ticketId,
    quantity: 1, // QR code for one person
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

/**
 * Finalise une commande après paiement et envoie les billets.
 * Cette fonction est appelée par le webhook après validation.
 */
export async function finalizePurchaseAndSendTicket(
  saleId: string
): Promise<PurchaseResult> {
  try {
    console.log('[FINALIZE] 🎫 Finalizing purchase for sale ID:', saleId);

    // 1. Récupérer la vente et l'événement
    const saleDoc = await firestore.collection('sales').doc(saleId).get();
    if (!saleDoc.exists) {
      throw new Error(`Sale ${saleId} not found.`);
    }
    const sale = { id: saleDoc.id, ...saleDoc.data() } as Sale;

    const eventDoc = await firestore.collection('events').doc(sale.eventId).get();
    if (!eventDoc.exists) {
      throw new Error(`Event ${sale.eventId} not found.`);
    }
    const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

    const ticket = event.tickets.find((t) => t.id === sale.ticketId);
    if (!ticket) {
      throw new Error(`Ticket type ${sale.ticketId} not found in event.`);
    }

    // 2. Générer les QR codes pour chaque billet individuel
    const ticketsForEmail: { ticketNumber: string; qrCodeURL: string }[] = [];
    for (let i = 1; i <= sale.quantity; i++) {
      const uniqueTicketNumber = `${sale.id}-I${i}`;
      const qrData = generateTicketQRData(sale, event, uniqueTicketNumber);
      const qrCodeURL = generateQRCodeURL(qrData);
      ticketsForEmail.push({ ticketNumber: uniqueTicketNumber, qrCodeURL });
    }

    // 3. Envoyer les emails
    try {
      await sendCustomerTicketEmail({
        to: sale.customerEmail,
        customerName: sale.customerName,
        event,
        ticket,
        sale,
        tickets: ticketsForEmail,
      });
      console.log(`[FINALIZE] ✅ Customer email sent with ${ticketsForEmail.length} tickets.`);
    } catch (emailError) {
      console.error('[FINALIZE] ⚠️ Customer email failed:', emailError);
    }

    try {
      const organizerDoc = await firestore.collection('users').doc(event.organizerId).get();
      if (organizerDoc.exists) {
        const organizer = organizerDoc.data() as User;
        await sendOrganizerNotificationEmail({
          sale,
          event,
          ticketName: ticket.name,
          organizerEmail: organizer.email,
        });
        console.log('[FINALIZE] ✅ Organizer notification sent');
      }
    } catch (orgError) {
      console.error('[FINALIZE] ⚠️ Organizer notification failed:', orgError);
    }

    if (ADMIN_EMAIL) {
      try {
        const organizerName = (await firestore.collection('users').doc(event.organizerId).get()).data()?.name || 'Inconnu';
        await sendAdminNotificationEmail({
          sale,
          event,
          ticketName: ticket.name,
          organizerName,
        });
        console.log('[FINALIZE] ✅ Admin notification sent');
      } catch (adminError) {
        console.error('[FINALIZE] ⚠️ Admin notification failed:', adminError);
      }
    }

    return {
      success: true,
      saleId: saleId,
      message: 'Purchase finalized and tickets sent.',
    };
  } catch (error: any) {
    console.error('[FINALIZE] ❌ Fatal error:', error);
    // Mettre à jour la vente pour indiquer l'échec de la finalisation
    await firestore.collection('sales').doc(saleId).update({
      status: 'FAILED',
      'paymentDetails.error': `Finalization failed: ${error.message}`
    }).catch(); // Ignorer les erreurs ici

    return {
      success: false,
      error: error.message || "Une erreur est survenue lors de la finalisation de l'achat",
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
    console.log('[RESEND] 📧 Resending ticket for sale ID:', saleId);

    const saleDoc = await firestore.collection('sales').doc(saleId).get();
    if (!saleDoc.exists) {
      return { success: false, error: 'Commande introuvable' };
    }
    const sale = { id: saleDoc.id, ...saleDoc.data() } as Sale;
    
    // On ne renvoie que les billets payés
    if (sale.status !== 'PAID') {
      return { success: false, error: 'Le paiement de cette commande n\'est pas confirmé.' };
    }

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

// L'ancienne fonction createPurchaseAndSendTicket est obsolète et a été remplacée
// par le flux initializePayment -> webhook -> finalizePurchaseAndSendTicket.
// On la laisse ici commentée pour référence au cas où, mais elle ne devrait plus être utilisée.
/*
export async function createPurchaseAndSendTicket(
  data: PurchaseData
): Promise<PurchaseResult> {
  // ... ancienne logique ...
}
*/
