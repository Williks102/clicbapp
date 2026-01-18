
'use server';

import { Resend } from 'resend';
import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type { Event, Sale, PurchaseData, PurchaseResult, TicketTier, User } from '@/lib/types';

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
  const uniquePart = parts[parts.length - 1] || parts[1] || orderId.substring(4, 12);
  return `TKT-${uniquePart}`;
}

function generateTicketQRData(sale: Sale, event: Event): string {
  return JSON.stringify({
    saleId: sale.id,
    eventId: sale.eventId,
    ticketId: sale.ticketId,
    quantity: sale.quantity,
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
    
    const eventDoc = await firestore.collection('events').doc(data.eventId).get();
    if (!eventDoc.exists) return { success: false, error: 'Événement introuvable' };
    const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

    const ticket = event.tickets.find(t => t.id === data.ticketId);
    if (!ticket) return { success: false, error: 'Type de billet introuvable' };

    const orderId = generateOrderNumber();
    const ticketNumber = generateTicketNumber(orderId);
    const purchaseDate = new Date().toISOString();

    const sale: Sale = {
      id: orderId,
      ticketNumber: ticketNumber,
      eventId: data.eventId,
      ticketId: data.ticketId,
      customerName: data.fullName,
      customerEmail: data.email,
      quantity: data.quantity,
      totalPrice: data.totalPrice,
      purchaseDate,
      organizerId: event.organizerId,
    };

    await firestore.collection('sales').doc(orderId).set(sale);
    console.log('[PURCHASE] ✅ Sale created in Firestore:', orderId);

    const qrData = generateTicketQRData(sale, event);
    const qrCodeURL = generateQRCodeURL(qrData);

    // Envoyer l'email au client
    try {
      await sendCustomerTicketEmail({
        to: data.email,
        customerName: data.fullName,
        event,
        ticket,
        sale,
        qrCodeURL,
      });
      console.log('[PURCHASE] ✅ Customer email sent');
    } catch (emailError) {
      console.error('[PURCHASE] ⚠️ Customer email failed:', emailError);
    }

    // Envoyer la notification à l'organisateur
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
        console.log('[PURCHASE] ✅ Organizer notification sent');
      }
    } catch (orgError) {
      console.error('[PURCHASE] ⚠️ Organizer notification failed:', orgError);
    }

    // Envoyer la notification à l'admin
    if (ADMIN_EMAIL) {
      try {
        const organizerName = (await firestore.collection('users').doc(event.organizerId).get()).data()?.name || 'Inconnu';
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
      message: 'Achat confirmé ! Vérifiez votre email pour votre billet.',
    };

  } catch (error: any) {
    console.error('[PURCHASE] ❌ Fatal error:', error);
    return {
      success: false,
      error: 'Une erreur est survenue lors de l\'achat',
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
  qrCodeURL: string;
};

async function sendCustomerTicketEmail(data: CustomerEmailData) {
  const { to, customerName, event, ticket, sale, qrCodeURL } = data;
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });

  const emailHtml = `
    <!DOCTYPE html>... (Contenu de l'email client - inchangé) ...</html>
  `; // Le contenu HTML est long, je le garde tel quel mais je le place dans la fonction correcte

  await resend.emails.send({
    from: 'ClicBillet <contact@clicbillet.com>',
    to,
    subject: `🎫 Votre billet pour ${event.name}`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; }
        .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f7f7f7; padding: 20px; }
        .ticket-card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; margin: 20px 0; }
        .event-name { font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 15px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .qr-section { text-align: center; padding: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header"><h1>ClicBillet</h1><p>Votre billet électronique</p></div>
      <div class="content">
        <p>Bonjour ${customerName},</p>
        <p>Merci pour votre achat ! Voici votre billet pour :</p>
        <div class="ticket-card">
          <div class="event-name">${event.name}</div>
          <div class="info-row"><span>📅 Date</span><span>${formattedDate} à ${formattedTime}</span></div>
          <div class="info-row"><span>📍 Lieu</span><span>${event.location}</span></div>
          <div class="info-row"><span>🎫 Billet</span><span>${ticket.name} (x${sale.quantity})</span></div>
          <div class="info-row"><span>💰 Total</span><span>${sale.totalPrice.toLocaleString('fr-FR')} F CFA</span></div>
          <div class="info-row"><span>🔢 N° Commande</span><span>${sale.id}</span></div>
        </div>
        <div class="qr-section">
          <h3>Votre QR Code d'Entrée</h3>
          <p>Présentez ce code à l'entrée</p>
          <img src="${qrCodeURL}" alt="QR Code" />
        </div>
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
    from: 'ClicBillet Ventes <ventes@clicbillet.com>',
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
    from: 'ClicBillet Admin <noreply@clicbillet.com>',
    to: ADMIN_EMAIL!,
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

    const qrData = generateTicketQRData(sale, event);
    const qrCodeURL = generateQRCodeURL(qrData);

    await sendCustomerTicketEmail({
      to: sale.customerEmail,
      customerName: sale.customerName,
      event,
      ticket,
      sale,
      qrCodeURL,
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
