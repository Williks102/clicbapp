import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { toOrder } from '@/lib/supabase/mappers';
import type { OrderRow } from '@/lib/supabase/types';
import { verifyTransaction, verifyWebhookSignature } from '@/lib/paystack';
import { sendLiveAccessEmail, sendVoteConfirmationEmail } from '@/lib/emails';

/**
 * Webhook Paystack.
 *
 * Trois barrières successives, chacune suffisante à elle seule pour rejeter
 * une notification forgée :
 *  1. la signature HMAC-SHA512 du corps brut, calculée avec la clé secrète ;
 *  2. l'interrogation directe de Paystack sur l'état réel de la transaction —
 *     le contenu du webhook n'est jamais cru sur parole ;
 *  3. la fonction `confirm_order_payment`, qui revalide le montant en base et
 *     reste idempotente en cas de rejeu.
 */
export async function POST(request: Request) {
  try {
    // Le corps doit être lu brut : toute re-sérialisation invaliderait la signature.
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[Webhook] ⛔ Signature Paystack invalide : notification rejetée.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: { reference?: string; status?: string };
    };

    console.log(`[Webhook] 🔔 Événement Paystack reçu : ${event.event}`);

    // Seule la réussite d'une transaction déclenche un effet métier.
    if (event.event !== 'charge.success') {
      return NextResponse.json({ status: 'ignored', event: event.event });
    }

    const reference = event.data?.reference;
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    // Source de vérité : l'API Paystack, et non la charge utile reçue.
    const transaction = await verifyTransaction(reference);
    if (!transaction) {
      console.error(`[Webhook] ❌ Vérification impossible pour ${reference}.`);
      return NextResponse.json({ error: 'Verification failed' }, { status: 502 });
    }

    if (transaction.status !== 'success') {
      console.log(
        `[Webhook] 📉 Transaction ${reference} non aboutie (${transaction.status}).`
      );

      await getSupabaseAdmin()
        .from('orders')
        .update({ status: 'FAILED', payment_details: event })
        .eq('id', reference)
        .eq('status', 'PENDING');

      return NextResponse.json({ status: 'ignored', reason: transaction.status });
    }

    const supabase = getSupabaseAdmin();

    const { data: outcome, error } = await supabase.rpc('confirm_order_payment', {
      p_order_id: reference,
      p_paid_amount: transaction.amount,
      p_payment_details: event,
    });

    if (error) {
      console.error('[Webhook] ❌ Confirmation impossible :', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (outcome === 'not_found') {
      console.error(`[Webhook] ❌ Commande ${reference} introuvable.`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (outcome === 'amount_mismatch') {
      console.error(
        `[Webhook] 🚨 Montant incohérent pour ${reference} : ${transaction.amount} encaissé. Commande signalée.`
      );
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    if (outcome === 'already_processed') {
      console.warn(`[Webhook] ⚠️ Commande ${reference} déjà traitée.`);
      return NextResponse.json({ status: 'already_processed' });
    }

    console.log(`[Webhook] ✅ Commande ${reference} confirmée.`);

    const { data: orderRow } = await supabase
      .from('orders')
      .select('*')
      .eq('id', reference)
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
        console.error("[Webhook] ⚠️ Envoi de l'e-mail échoué :", emailError);
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('[Webhook] ❌ Erreur non gérée :', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
