import { NextResponse } from 'next/server';
import { createPurchaseAndSendTicket } from '@/app/actions/ticket-actions';
import { firestore } from '@/lib/firebase-admin';
import type { PurchaseData } from '@/lib/types';

const SUCCESS_STATUSES = new Set(['SUCCESSFUL', 'SUCCESS', 'PAID', 'success']);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Webhook] Received payload from Paiement Pro:', body);

    // IMPORTANT: in production, verify Paiement Pro signature/header before processing.
    const paymentStatus = body.status;
    const referenceNumber = body.referenceNumber || body.reference_number;

    if (!referenceNumber) {
      console.error('[Webhook] Missing reference number in payload');
      return NextResponse.json({ error: 'Missing reference number' }, { status: 400 });
    }

    if (!SUCCESS_STATUSES.has(paymentStatus)) {
      console.log(`[Webhook] Payment ignored for ${referenceNumber}. Status: ${paymentStatus}`);
      return NextResponse.json({ status: 'ignored', message: `Payment status was ${paymentStatus}` });
    }

    const paymentSessionRef = firestore.collection('payment_sessions').doc(referenceNumber);
    const paymentSessionSnap = await paymentSessionRef.get();

    if (!paymentSessionSnap.exists) {
      console.error(`[Webhook] No payment session found for reference ${referenceNumber}`);
      return NextResponse.json({ error: 'Unknown payment reference' }, { status: 404 });
    }

    const paymentSession = paymentSessionSnap.data() as {
      status?: string;
      purchaseData?: PurchaseData;
      saleId?: string | null;
    };

    if (paymentSession.status === 'completed' && paymentSession.saleId) {
      console.log(`[Webhook] Duplicate callback for ${referenceNumber}, already completed.`);
      return NextResponse.json({ status: 'success', message: 'Already processed' });
    }

    if (!paymentSession.purchaseData) {
      console.error(`[Webhook] Missing trusted purchase data for ${referenceNumber}`);
      return NextResponse.json({ error: 'Missing purchase data' }, { status: 400 });
    }

    const result = await createPurchaseAndSendTicket(paymentSession.purchaseData);

    if (!result.success || !result.saleId) {
      console.error('[Webhook] Error creating ticket after successful payment:', result.error);
      return NextResponse.json({ status: 'error', message: result.error || 'Ticket creation failed' }, { status: 500 });
    }

    await paymentSessionRef.set(
      {
        status: 'completed',
        saleId: result.saleId,
        processedAt: new Date().toISOString(),
        webhookPayload: body,
      },
      { merge: true }
    );

    console.log(`[Webhook] Ticket created successfully. Sale ID: ${result.saleId}`);
    return NextResponse.json({ status: 'success', message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
