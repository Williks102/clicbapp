'use server';

import { Resend } from 'resend';
import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type { Event, Sale, PurchaseData, PurchaseResult } from '@/lib/types';

const resend = new Resend(process.env.RESEND_API_KEY);

// ==================== HELPERS ====================

/**
 * Génère un numéro de commande unique
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

/**
 * Génère le contenu du QR code pour le billet
 */
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

/**
 * Génère l'URL du QR code via API externe
 */
function generateQRCodeURL(data: string): string {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
}

// ==================== ACTIONS ====================

/**
 * Crée une vente et envoie le billet par email
 */
export async function createPurchaseAndSendTicket(
  data: PurchaseData
): Promise<PurchaseResult> {
  try {
    console.log('[PURCHASE] 🎫 Creating purchase...');

    // Récupérer l'événement
    const eventDoc = await firestore.collection('events').doc(data.eventId).get();
    
    if (!eventDoc.exists) {
      return { success: false, error: 'Événement introuvable' };
    }

    const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

    // Trouver le billet
    const ticket = event.tickets.find(t => t.id === data.ticketId);
    
    if (!ticket) {
      return { success: false, error: 'Type de billet introuvable' };
    }

    // Vérifier la disponibilité
    // TODO: Implémenter la vérification de stock réelle

    // Générer l'ID de vente
    const saleId = generateOrderNumber();
    const purchaseDate = new Date().toISOString();

    // Créer l'objet Sale
    const sale: Sale = {
      id: saleId,
      eventId: data.eventId,
      ticketId: data.ticketId,
      customerName: data.fullName,
      customerEmail: data.email,
      quantity: data.quantity,
      totalPrice: data.totalPrice,
      purchaseDate,
      organizerId: event.organizerId,
    };

    // Sauvegarder dans Firestore
    await firestore.collection('sales').doc(saleId).set(sale);
    console.log('[PURCHASE] ✅ Sale created in Firestore');

    // Générer le QR code
    const qrData = generateTicketQRData(sale, event);
    const qrCodeURL = generateQRCodeURL(qrData);

    // Envoyer l'email avec le billet
    try {
      await sendTicketEmail({
        to: data.email,
        customerName: data.fullName,
        event,
        ticket,
        sale,
        qrCodeURL,
      });
      console.log('[PURCHASE] ✅ Email sent successfully');
    } catch (emailError) {
      console.error('[PURCHASE] ⚠️ Email failed but sale created:', emailError);
      // On continue même si l'email échoue - la vente est créée
    }

    return {
      success: true,
      saleId,
      message: 'Achat confirmé ! Vérifiez votre email pour votre billet.',
    };

  } catch (error: any) {
    console.error('[PURCHASE] ❌ Error:', error);
    return {
      success: false,
      error: 'Une erreur est survenue lors de l\'achat',
    };
  }
}

// ==================== EMAIL ====================

type TicketEmailData = {
  to: string;
  customerName: string;
  event: Event;
  ticket: any;
  sale: Sale;
  qrCodeURL: string;
};

async function sendTicketEmail(data: TicketEmailData) {
  const { to, customerName, event, ticket, sale, qrCodeURL } = data;

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .ticket-card {
      background: white;
      border-radius: 10px;
      padding: 25px;
      margin: 20px 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .event-name {
      font-size: 24px;
      font-weight: bold;
      color: #FF9500;
      margin-bottom: 15px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .info-label {
      font-weight: 600;
      color: #666;
    }
    .info-value {
      color: #333;
    }
    .qr-section {
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background: white;
      border-radius: 10px;
    }
    .qr-section img {
      max-width: 250px;
      border: 3px solid #FF9500;
      border-radius: 10px;
      padding: 10px;
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
    .button {
      display: inline-block;
      background: #FF9500;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Votre Billet Électronique</h1>
  </div>
  
  <div class="content">
    <p>Bonjour <strong>${customerName}</strong>,</p>
    
    <p>Merci pour votre achat ! Voici votre billet électronique pour l'événement :</p>
    
    <div class="ticket-card">
      <div class="event-name">${event.name}</div>
      
      <div class="info-row">
        <span class="info-label">📅 Date</span>
        <span class="info-value">${formattedDate}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">🕐 Heure</span>
        <span class="info-value">${formattedTime}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">📍 Lieu</span>
        <span class="info-value">${event.location}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">🎫 Type de billet</span>
        <span class="info-value">${ticket.name}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">👥 Quantité</span>
        <span class="info-value">${sale.quantity}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">💰 Prix total</span>
        <span class="info-value">${sale.totalPrice.toLocaleString('fr-FR')} FCFA</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">🔢 N° de commande</span>
        <span class="info-value">${sale.id}</span>
      </div>
    </div>
    
    <div class="qr-section">
      <h3>Votre QR Code d'Entrée</h3>
      <p>Présentez ce code à l'entrée de l'événement</p>
      <img src="${qrCodeURL}" alt="QR Code du billet" />
    </div>
    
    <div class="warning">
      <strong>⚠️ Important :</strong>
      <ul>
        <li>Conservez ce billet dans vos emails</li>
        <li>Présentez le QR code à l'entrée (sur écran ou imprimé)</li>
        <li>Arrivez 15 minutes avant le début</li>
        <li>Ce billet est valable pour ${sale.quantity} personne(s)</li>
      </ul>
    </div>
    
    <p>Pour toute question, contactez l'organisateur via la plateforme.</p>
    
    <p style="margin-top: 30px;">
      À bientôt ! 🎊<br>
      <strong>L'équipe ClicBillet</strong>
    </p>
  </div>
  
  <div class="footer">
    <p>© ${new Date().getFullYear()} ClicBillet - Plateforme de billetterie en Côte d'Ivoire</p>
    <p>Cet email a été envoyé à ${to}</p>
  </div>
</body>
</html>
  `;

  await resend.emails.send({
    from: 'ClicBillet <billets@monticket.online>',
    to,
    subject: `🎫 Votre billet pour ${event.name}`,
    html: emailHtml,
  });
}

/**
 * Renvoie un billet par email
 */
export async function resendTicketEmail(saleId: string): Promise<PurchaseResult> {
  try {
    console.log('[RESEND] 📧 Resending ticket...');

    // Récupérer la vente
    const saleDoc = await firestore.collection('sales').doc(saleId).get();
    
    if (!saleDoc.exists) {
      return { success: false, error: 'Commande introuvable' };
    }

    const sale = { id: saleDoc.id, ...saleDoc.data() } as Sale;

    // Récupérer l'événement
    const eventDoc = await firestore.collection('events').doc(sale.eventId).get();
    
    if (!eventDoc.exists) {
      return { success: false, error: 'Événement introuvable' };
    }

    const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

    // Trouver le billet
    const ticket = event.tickets.find(t => t.id === sale.ticketId);

    // Générer le QR code
    const qrData = generateTicketQRData(sale, event);
    const qrCodeURL = generateQRCodeURL(qrData);

    // Renvoyer l'email
    await sendTicketEmail({
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