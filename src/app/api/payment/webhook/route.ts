import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/paystack';
import { settleOrder } from '@/lib/settle-order';

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
 *
 * Les barrières 2 et 3 sont portées par `settleOrder`, partagée avec le
 * rapprochement déclenché depuis la page de retour : une commande payée est
 * créditée même si cette notification n'arrive jamais.
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

    const outcome = await settleOrder(reference, 'webhook', event);

    switch (outcome) {
      case 'paid':
      case 'already_processed':
        return NextResponse.json({ status: outcome });
      case 'not_found':
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      case 'amount_mismatch':
        return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
      case 'unverifiable':
        return NextResponse.json({ error: 'Verification failed' }, { status: 502 });
      case 'not_successful':
        return NextResponse.json({ status: 'ignored' });
      default:
        return NextResponse.json({ error: 'Settlement failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('[Webhook] ❌ Erreur non gérée :', error);
    // Le détail reste dans les journaux : le renvoyer livrerait des noms de
    // contraintes ou de colonnes PostgreSQL à l'appelant.
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
