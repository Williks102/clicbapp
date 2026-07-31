import 'server-only';
import { revalidatePath } from 'next/cache';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { toOrder } from '@/lib/supabase/mappers';
import type { OrderRow } from '@/lib/supabase/types';
import { verifyTransaction } from '@/lib/paystack';
import { sendLiveAccessEmail, sendVoteConfirmationEmail } from '@/lib/emails';

/**
 * Règlement d'une commande.
 *
 * Le webhook est la voie normale, mais il peut ne jamais arriver : URL mal
 * déclarée dans le tableau de bord, domaine injoignable, indisponibilité
 * passagère. L'argent, lui, a bien été encaissé. Cette fonction est donc
 * appelée par deux chemins — la notification de Paystack et la page de retour
 * du client — afin qu'une commande payée finisse toujours par être créditée.
 *
 * Elle est sûre quelle que soit l'origine de l'appel : le montant vient de
 * l'API Paystack et non de l'appelant, et `confirm_order_payment` revalide ce
 * montant en base tout en restant idempotente.
 */
export type SettleOutcome =
  | 'paid'
  | 'already_processed'
  | 'amount_mismatch'
  | 'not_found'
  | 'unverifiable'
  | 'not_successful'
  | 'error';

export async function settleOrder(
  reference: string,
  source: 'webhook' | 'callback',
  paymentDetails: unknown = { source }
): Promise<SettleOutcome> {
  const tag = source === 'webhook' ? '[Webhook]' : '[Rapprochement]';

  // Source de vérité : l'API Paystack, jamais la charge utile reçue.
  const transaction = await verifyTransaction(reference);
  if (!transaction) {
    console.error(`${tag} ❌ Vérification impossible pour ${reference}.`);
    return 'unverifiable';
  }

  const supabase = getSupabaseAdmin();

  if (transaction.status !== 'success') {
    console.log(`${tag} 📉 Transaction ${reference} non aboutie (${transaction.status}).`);

    // Une transaction abandonnée peut être reprise : seul un échec définitif
    // ferme la commande.
    if (transaction.status === 'failed' || transaction.status === 'reversed') {
      await supabase
        .from('orders')
        .update({ status: 'FAILED', payment_details: paymentDetails })
        .eq('id', reference)
        .eq('status', 'PENDING');
    }

    return 'not_successful';
  }

  const { data: outcome, error } = await supabase.rpc('confirm_order_payment', {
    p_order_id: reference,
    p_paid_amount: transaction.amount,
    p_payment_details: paymentDetails,
  });

  if (error) {
    console.error(`${tag} ❌ Confirmation impossible :`, error.message);
    return 'error';
  }

  if (outcome === 'not_found') {
    console.error(`${tag} ❌ Commande ${reference} introuvable.`);
    return 'not_found';
  }

  if (outcome === 'amount_mismatch') {
    console.error(
      `${tag} 🚨 Montant incohérent pour ${reference} : ${transaction.amount} encaissé. Commande signalée.`
    );
    return 'amount_mismatch';
  }

  if (outcome === 'already_processed') return 'already_processed';

  console.log(`${tag} ✅ Commande ${reference} confirmée.`);

  // Effets de bord postérieurs au crédit : ils ne doivent jamais faire échouer
  // le règlement lui-même, déjà acté en base.
  try {
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

      try {
        if (order.type === 'VOTE_PACK') {
          await sendVoteConfirmationEmail(order);
        } else {
          // Le code est généré par la base à l'insertion de l'accès.
          const { data: access } = await supabase
            .from('live_access')
            .select('access_code')
            .eq('order_id', reference)
            .maybeSingle();

          await sendLiveAccessEmail(
            order,
            (access as { access_code?: string } | null)?.access_code
          );
        }
      } catch (emailError) {
        console.error(`${tag} ⚠️ Envoi de l'e-mail échoué :`, emailError);
      }
    }
  } catch (sideEffectError) {
    console.error(`${tag} ⚠️ Effets postérieurs au crédit échoués :`, sideEffectError);
  }

  return 'paid';
}
