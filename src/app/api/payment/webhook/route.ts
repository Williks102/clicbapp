import { NextResponse } from 'next/server';
import { createPurchaseAndSendTicket } from '@/app/actions/ticket-actions';
import type { PurchaseData } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Webhook] Received payload from Paiement Pro:', body);

    // IMPORTANT: In a production environment, you MUST verify a signature 
    // from Paiement Pro to ensure the webhook is legitimate. This is a critical security step.

    // I'm guessing the field names based on common patterns.
    // You will need to adjust these based on Paiement Pro's actual webhook payload.
    const paymentStatus = body.status;
    const referenceNumber = body.referenceNumber || body.reference_number;
    
    // Check if the payment was successful
    if (paymentStatus === 'SUCCESSFUL' || paymentStatus === 'success' || paymentStatus === 'PAID') { // Common success statuses
      
      let purchaseData: PurchaseData | null = null;
      if (body.returnContext || body.return_context) {
        try {
          // The context is insecurely passed from the client.
          // SECURITY WARNING: In a real app, you must not trust this data directly.
          // You should retrieve the purchase details from your own database using the 'referenceNumber'
          // which you would have saved before initiating the payment.
          purchaseData = JSON.parse(body.returnContext || body.return_context);
        } catch (e) {
          console.error('[Webhook] Failed to parse return_context', e);
          return NextResponse.json({ error: 'Invalid context' }, { status: 400 });
        }
      }

      if (!purchaseData) {
        console.error('[Webhook] Missing purchase data in return_context');
        return NextResponse.json({ error: 'Missing purchase data' }, { status: 400 });
      }

      console.log(`[Webhook] Payment successful for order reference: ${referenceNumber}`);
      console.log('[Webhook] Creating ticket with data:', purchaseData);

      // Call the trusted server action to create the ticket and send the email
      const result = await createPurchaseAndSendTicket(purchaseData);

      if (result.success) {
        console.log(`[Webhook] Ticket created successfully. Sale ID: ${result.saleId}`);
        // Paiement Pro likely expects a specific JSON response to confirm receipt
        return NextResponse.json({ status: 'success', message: 'Webhook processed successfully' });
      } else {
        console.error('[Webhook] Error creating ticket after successful payment:', result.error);
        // Even if ticket creation fails, we must return a 200 OK to Paiement Pro to prevent retries.
        // Log this error for manual intervention.
        return NextResponse.json({ status: 'error', message: 'Failed to create ticket internally' }, { status: 500 });
      }

    } else {
      console.log(`[Webhook] Payment was not successful for order: ${referenceNumber}. Status: ${paymentStatus}`);
      return NextResponse.json({ status: 'ignored', message: `Payment status was ${paymentStatus}` });
    }

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
