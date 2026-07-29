import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { toOrder } from '@/lib/supabase/mappers';
import type { OrderRow } from '@/lib/supabase/types';
import { sendLiveAccessEmail, sendVoteConfirmationEmail } from '@/lib/emails';

const SUCCESS_STATUSES = new Set(['SUCCESSFUL', 'SUCCESS', 'PAID', 'success', 'paid']);

/**
 * Authentifie l'appelant du webhook.
 *
 * ⚠️ Sans secret configuré, cet endpoint est **forgeable** : toute personne
 * connaissant la référence d'une commande — à commencer par l'acheteur, qui la
 * voit dans son navigateur — peut se faire créditer des votes sans payer.
 *
 * Pour fermer cette porte, déclarez `PAYMENT_WEBHOOK_SECRET` et enregistrez
 * l'URL de notification correspondante **dans le tableau de bord Paiement Pro**
 * (et non depuis le client, où le secret serait visible) :
 *     https://votre-domaine/api/payment/webhook?secret=<PAYMENT_WEBHOOK_SECRET>
 *
 * Le secret est comparé en temps constant afin de ne pas le divulguer par
 * mesure du temps de réponse.
 */
function isAuthenticCaller(request: Request): boolean {
  const expected = process.env.PAYMENT_WEBHOOK_SECRET;

  if (!expected) {
    console.warn(
      '[Webhook] ⚠️ PAYMENT_WEBHOOK_SECRET non défini : endpoint non authentifié, ' +
        'des votes peuvent être crédités sans paiement réel.'
    );
    return true;
  }

  const provided =
    new URL(request.url).searchParams.get('secret') ??
    request.headers.get('x-webhook-secret') ??
    '';

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

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
    if (!isAuthenticCaller(request)) {
      console.error('[Webhook] ⛔ Appel rejeté : secret invalide ou absent.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
