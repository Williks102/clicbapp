import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { toOrder } from '@/lib/supabase/mappers';
import type { OrderRow } from '@/lib/supabase/types';
import { sendLiveAccessEmail, sendVoteConfirmationEmail } from '@/lib/emails';

const SUCCESS_STATUSES = new Set(['SUCCESSFUL', 'SUCCESS', 'PAID', 'success', 'paid']);

/**
 * Webhook Paiement Pro.
 *
 * L'application ne fait que relayer la notification : la confirmation, le
 * contrôle du montant et le crédit des votes sont exécutés par la fonction
 * PostgreSQL `confirm_order_payment`, dans une transaction unique et
 * idempotente. Un webhook rejoué ne peut donc pas créditer deux fois.
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

    const supabase = getSupabaseAdmin();

    // Paiement en échec : la commande est close sans effet métier.
    if (!paymentStatus || !SUCCESS_STATUSES.has(paymentStatus)) {
      console.log(`[Webhook] 📉 Paiement échoué pour ${referenceNumber}: ${paymentStatus}`);

      await supabase
        .from('orders')
        .update({ status: 'FAILED', payment_details: body })
        .eq('id', referenceNumber)
        .eq('status', 'PENDING');

      return NextResponse.json({
        status: 'ignored',
        message: `Payment status was ${paymentStatus}`,
      });
    }

    if (!Number.isFinite(paidAmount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const { data: outcome, error } = await supabase.rpc('confirm_order_payment', {
      p_order_id: referenceNumber,
      p_paid_amount: paidAmount,
      p_payment_details: body,
    });

    if (error) {
      console.error('[Webhook] ❌ Confirmation impossible:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (outcome === 'not_found') {
      console.error(`[Webhook] ❌ Commande ${referenceNumber} introuvable.`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (outcome === 'amount_mismatch') {
      console.error(
        `[Webhook] 🚨 Montant incohérent pour ${referenceNumber} : ${paidAmount} reçu. Commande signalée.`
      );
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    if (outcome === 'already_processed') {
      console.warn(`[Webhook] ⚠️ Commande ${referenceNumber} déjà traitée.`);
      return NextResponse.json({
        status: 'already_processed',
        message: 'Webhook already handled.',
      });
    }

    console.log(`[Webhook] ✅ Commande ${referenceNumber} confirmée.`);

    const { data: orderRow } = await supabase
      .from('orders')
      .select('*')
      .eq('id', referenceNumber)
      .maybeSingle();

    if (orderRow) {
      const order = toOrder(orderRow as OrderRow);

      revalidatePath(`/competitions/${order.competitionId}`);
      if (order.candidateId) {
        revalidatePath(`/competitions/${order.competitionId}/candidates/${order.candidateId}`);
      }
      revalidatePath(`/competitions/${order.competitionId}/live`);

      // L'e-mail ne doit jamais faire échouer la confirmation de paiement.
      try {
        if (order.type === 'VOTE_PACK') {
          await sendVoteConfirmationEmail(order);
        } else {
          await sendLiveAccessEmail(order);
        }
      } catch (emailError) {
        console.error("[Webhook] ⚠️ Envoi de l'e-mail échoué:", emailError);
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('[Webhook] ❌ Erreur non gérée:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
