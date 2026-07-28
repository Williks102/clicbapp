import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import { applyPaidVotes } from '@/app/actions/vote-actions';
import { grantLiveAccess } from '@/app/actions/live-actions';
import { sendLiveAccessEmail, sendVoteConfirmationEmail } from '@/lib/emails';
import type { Order } from '@/lib/types';

const SUCCESS_STATUSES = new Set(['SUCCESSFUL', 'SUCCESS', 'PAID', 'success', 'paid']);

/**
 * Webhook Paiement Pro.
 * Une même référence peut être notifiée plusieurs fois : chaque étape est idempotente.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Webhook] 🔔 Notification Paiement Pro reçue:', body);

    const referenceNumber: string | undefined = body.referenceNumber;
    const paymentStatus: string | undefined = body.status;
    const paidAmount = Number.parseFloat(body.amount);

    if (!referenceNumber) {
      return NextResponse.json({ error: 'Missing referenceNumber' }, { status: 400 });
    }

    const orderRef = firestore.collection('orders').doc(referenceNumber);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error(`[Webhook] ❌ Commande ${referenceNumber} introuvable.`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = { id: orderDoc.id, ...orderDoc.data() } as Order;

    if (order.status !== 'PENDING') {
      console.warn(
        `[Webhook] ⚠️ Commande ${referenceNumber} déjà traitée (statut: ${order.status}).`
      );
      return NextResponse.json({
        status: 'already_processed',
        message: 'Webhook already handled.',
      });
    }

    if (!paymentStatus || !SUCCESS_STATUSES.has(paymentStatus)) {
      console.log(`[Webhook] 📉 Paiement échoué pour ${referenceNumber}: ${paymentStatus}`);
      await orderRef.update({ status: 'FAILED', paymentDetails: body });
      return NextResponse.json({
        status: 'ignored',
        message: `Payment status was ${paymentStatus}`,
      });
    }

    // Le montant réellement payé doit correspondre au montant calculé côté serveur.
    if (!Number.isFinite(paidAmount) || paidAmount !== order.amount) {
      console.error(
        `[Webhook] 🚨 Montant incohérent pour ${referenceNumber}: attendu ${order.amount}, reçu ${paidAmount}.`
      );
      await orderRef.update({ status: 'FLAGGED', paymentDetails: body });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    if (order.type === 'VOTE_PACK') {
      if (!order.candidateId || !order.votes) {
        await orderRef.update({ status: 'FLAGGED', paymentDetails: body });
        return NextResponse.json({ error: 'Invalid vote order' }, { status: 400 });
      }

      await applyPaidVotes({
        competitionId: order.competitionId,
        candidateId: order.candidateId,
        candidateName: order.candidateName || '',
        quantity: order.votes,
        orderId: order.id,
        amount: order.amount,
        userId: order.userId,
        voterEmail: order.customerEmail,
        voterName: order.customerName,
      });
    } else if (order.type === 'LIVE_ACCESS') {
      if (!order.userId) {
        await orderRef.update({ status: 'FLAGGED', paymentDetails: body });
        return NextResponse.json({ error: 'Invalid live access order' }, { status: 400 });
      }

      await grantLiveAccess({
        userId: order.userId,
        competitionId: order.competitionId,
        orderId: order.id,
        pricePaid: order.amount,
      });
    }

    await orderRef.update({
      status: 'PAID',
      paidAt: new Date().toISOString(),
      paymentDetails: body,
    });

    console.log(`[Webhook] ✅ Commande ${referenceNumber} confirmée (${order.type}).`);

    // L'e-mail ne doit jamais faire échouer la confirmation de paiement.
    try {
      const paidOrder: Order = { ...order, status: 'PAID' };
      if (order.type === 'VOTE_PACK') {
        await sendVoteConfirmationEmail(paidOrder);
      } else {
        await sendLiveAccessEmail(paidOrder);
      }
    } catch (emailError) {
      console.error('[Webhook] ⚠️ Envoi de l\'e-mail échoué:', emailError);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('[Webhook] ❌ Erreur non gérée:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
