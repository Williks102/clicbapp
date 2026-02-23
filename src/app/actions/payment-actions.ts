'use server';

import { firestore } from '@/lib/firebase-admin';
import type { Event, PurchaseData } from '@/lib/types';
import { randomUUID } from 'crypto';

type CreatePaymentSessionInput = {
  eventId: string;
  ticketId: string;
  quantity: number;
  fullName: string;
  email: string;
};

type CreatePaymentSessionResult = {
  success: boolean;
  error?: string;
  referenceNumber?: string;
  returnContext?: string;
  amount?: number;
  description?: string;
};

function buildReferenceNumber(eventId: string) {
  const shortEventId = eventId.slice(0, 6).toUpperCase();
  const uid = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
  return `CB-${shortEventId}-${uid}`;
}

export async function createPaiementProSession(
  input: CreatePaymentSessionInput
): Promise<CreatePaymentSessionResult> {
  try {
    if (!input.eventId || !input.ticketId) {
      return { success: false, error: 'Événement ou ticket invalide.' };
    }

    if (input.quantity < 1 || input.quantity > 10) {
      return { success: false, error: 'Quantité invalide.' };
    }

    const eventRef = firestore.collection('events').doc(input.eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      return { success: false, error: 'Événement introuvable.' };
    }

    const event = { id: eventSnap.id, ...eventSnap.data() } as Event;
    const ticket = event.tickets.find((item) => item.id === input.ticketId);

    if (!ticket) {
      return { success: false, error: 'Ticket introuvable.' };
    }

    if (ticket.quantity < input.quantity) {
      return { success: false, error: 'Stock insuffisant pour ce ticket.' };
    }

    const referenceNumber = buildReferenceNumber(input.eventId);
    const amount = ticket.price * input.quantity;

    const purchaseData: PurchaseData = {
      eventId: input.eventId,
      ticketId: input.ticketId,
      quantity: input.quantity,
      fullName: input.fullName,
      email: input.email,
      totalPrice: amount,
    };

    const paymentSessionRef = firestore.collection('payment_sessions').doc(referenceNumber);
    await paymentSessionRef.set({
      referenceNumber,
      status: 'initiated',
      provider: 'paiementpro',
      eventId: input.eventId,
      ticketId: input.ticketId,
      purchaseData,
      amount,
      createdAt: new Date().toISOString(),
      processedAt: null,
      saleId: null,
    });

    return {
      success: true,
      referenceNumber,
      amount,
      description: `Achat de ${input.quantity} billet(s) pour "${event.name}"`,
      returnContext: JSON.stringify({ paymentSessionId: referenceNumber }),
    };
  } catch (error) {
    console.error('[PAYMENT SESSION] ❌ Error creating payment session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Impossible de préparer le paiement.',
    };
  }
}
