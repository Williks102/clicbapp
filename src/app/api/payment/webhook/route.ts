
import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { finalizePurchaseAndSendTicket } from '@/app/actions/ticket-actions';
import type { Event, Sale } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Webhook] 🔔 Received payload from Paiement Pro:', body);

    // 1. Extraire les informations essentielles
    const paymentStatus = body.status;
    const referenceNumber = body.referenceNumber;
    const paidAmount = parseFloat(body.amount);

    if (!referenceNumber) {
      console.error('[Webhook] ❌ Missing referenceNumber in payload.');
      return NextResponse.json({ error: 'Missing referenceNumber' }, { status: 400 });
    }

    // 2. Récupérer la commande en attente depuis Firestore
    const saleRef = firestore.collection('sales').doc(referenceNumber);
    const saleDoc = await saleRef.get();

    if (!saleDoc.exists) {
      console.error(`[Webhook] ❌ Sale with reference ${referenceNumber} not found.`);
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const sale = saleDoc.data() as Sale;

    // 3. Vérifier que la commande est bien en attente
    if (sale.status !== 'PENDING') {
      console.warn(`[Webhook] ⚠️ Received webhook for an already processed sale: ${referenceNumber}, status: ${sale.status}`);
      return NextResponse.json({ status: 'already_processed', message: 'Webhook was already handled.' });
    }

    // Si le paiement n'est pas un succès
    if (paymentStatus !== 'SUCCESSFUL' && paymentStatus !== 'success' && paymentStatus !== 'PAID') {
        console.log(`[Webhook] 📉 Payment failed for ${referenceNumber}. Status: ${paymentStatus}`);
        await saleRef.update({ status: 'FAILED', paymentDetails: body });
        return NextResponse.json({ status: 'ignored', message: `Payment status was ${paymentStatus}` });
    }

    // 4. Validation cruciale : comparer les montants
    if (paidAmount !== sale.totalPrice) {
      console.error(`[Webhook] 🚨 SECURITY ALERT: Amount mismatch for sale ${referenceNumber}. Expected ${sale.totalPrice}, got ${paidAmount}.`);
      await saleRef.update({ status: 'FLAGGED', paymentDetails: body });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }
    
    console.log(`[Webhook] ✅ Payment successful for ${referenceNumber}. Amount validated.`);

    // 5. Exécuter la transaction finale
    const eventRef = firestore.collection('events').doc(sale.eventId);

    await firestore.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists) throw new Error(`Event ${sale.eventId} not found`);

      const event = eventDoc.data() as Event;
      const ticketIndex = event.tickets.findIndex(t => t.id === sale.ticketId);
      if (ticketIndex === -1) throw new Error(`Ticket ${sale.ticketId} not found`);

      const ticket = event.tickets[ticketIndex];
      if (ticket.quantity < sale.quantity) throw new Error(`Not enough tickets in stock for ${ticket.name}`);

      // Décrémenter la quantité
      const updatedTickets = [...event.tickets];
      updatedTickets[ticketIndex] = { ...ticket, quantity: ticket.quantity - sale.quantity };
      transaction.update(eventRef, { tickets: updatedTickets });

      // Mettre à jour le statut de la vente
      transaction.update(saleRef, { status: 'PAID', paymentDetails: body });
    });

    console.log(`[Webhook] 📦 Stock updated and sale ${referenceNumber} marked as PAID.`);

    // 6. Envoyer les billets (après la transaction réussie)
    await finalizePurchaseAndSendTicket(referenceNumber);

    return NextResponse.json({ status: 'success', message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('[Webhook] ❌ Unhandled error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
