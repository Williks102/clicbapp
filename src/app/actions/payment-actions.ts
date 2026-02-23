
'use server';

import { firestore } from '@/lib/firebase-admin';
import { z } from 'zod';
import type { Event, Sale } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';

const initializePaymentSchema = z.object({
  eventId: z.string(),
  ticketId: z.string(),
  quantity: z.number().int().min(1),
  fullName: z.string().min(2),
  email: z.string().email(),
});

type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;

/**
 * Initialise une transaction de paiement côté serveur.
 * - Récupère le prix sécurisé depuis Firestore.
 * - Crée une commande avec le statut PENDING.
 * - Retourne les informations nécessaires pour le client.
 */
export async function initializePayment(
  data: InitializePaymentInput
): Promise<{
  success: boolean;
  error?: string;
  reference?: string;
  amount?: number;
  merchantId?: string;
}> {
  try {
    console.log('[PAYMENT_INIT] 🚀 Initializing payment...');
    const validatedData = initializePaymentSchema.parse(data);

    // Récupérer l'événement depuis Firestore
    const eventRef = firestore.collection('events').doc(validatedData.eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      throw new Error('Événement introuvable.');
    }

    const event = eventDoc.data() as Event;

    // Trouver le billet et vérifier la quantité
    const ticket = event.tickets.find((t) => t.id === validatedData.ticketId);
    if (!ticket) {
      throw new Error('Type de billet introuvable.');
    }

    if (ticket.quantity < validatedData.quantity) {
      throw new Error('Quantité de billets insuffisante.');
    }

    // Calculer le prix total côté serveur
    const totalPrice = ticket.price * validatedData.quantity;

    // Générer une référence unique
    const referenceNumber = generateId(`SALE-${event.id.slice(0, 4)}`);

    // Créer la commande PENDING dans Firestore
    const saleData: Sale = {
      id: referenceNumber,
      eventId: validatedData.eventId,
      ticketId: validatedData.ticketId,
      customerName: validatedData.fullName,
      customerEmail: validatedData.email,
      quantity: validatedData.quantity,
      totalPrice: totalPrice,
      purchaseDate: new Date().toISOString(),
      organizerId: event.organizerId,
      status: 'PENDING',
    };

    await firestore.collection('sales').doc(referenceNumber).set(saleData);

    console.log('[PAYMENT_INIT] ✅ Pending sale created:', referenceNumber);

    return {
      success: true,
      reference: referenceNumber,
      amount: totalPrice,
      merchantId: process.env.NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID,
    };
  } catch (error) {
    console.error('[PAYMENT_INIT] ❌ Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erreur inconnue.';
    return { success: false, error: errorMessage };
  }
}

/**
 * Nettoie les ventes en attente qui ont plus de 24 heures.
 */
export async function cleanupPendingSales(): Promise<{
  success: boolean;
  cleanedCount: number;
}> {
  console.log('[CLEANUP] 🧹 Starting cleanup of pending sales...');
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const pendingSalesQuery = firestore
      .collection('sales')
      .where('status', '==', 'PENDING')
      .where('purchaseDate', '<', twentyFourHoursAgo.toISOString());

    const snapshot = await pendingSalesQuery.get();

    if (snapshot.empty) {
      console.log('[CLEANUP] ✅ No expired pending sales found.');
      return { success: true, cleanedCount: 0 };
    }

    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
      console.log(`[CLEANUP] 🗑️ Deleting pending sale ${doc.id}`);
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`[CLEANUP] ✅ Successfully cleaned ${snapshot.size} sales.`);
    return { success: true, cleanedCount: snapshot.size };
  } catch (error) {
    console.error('[CLEANUP] ❌ Error during cleanup:', error);
    return { success: false, cleanedCount: 0 };
  }
}
