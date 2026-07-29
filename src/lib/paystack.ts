import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Client Paystack.
 *
 * Contrairement à l'intégration précédente, aucune clé ni aucun SDK n'est
 * exposé au navigateur : le serveur crée la transaction, Paystack renvoie une
 * URL de paiement, et le client est simplement redirigé dessus.
 */

const PAYSTACK_API = 'https://api.paystack.co';

/** Devise de la plateforme. Le franc CFA n'a pas de décimale. */
export const CURRENCY = 'XOF';

/**
 * Paystack attend un montant en sous-unités. Le XOF n'en possède pas, mais
 * l'API impose malgré tout de multiplier par 100 : omettre cette conversion
 * facturerait le centième du prix affiché.
 */
export function toSubunit(amount: number): number {
  return Math.round(amount) * 100;
}

export function fromSubunit(amount: number): number {
  return amount / 100;
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error(
      'PAYSTACK_SECRET_KEY manquante : impossible de contacter Paystack.'
    );
  }
  return key;
}

type InitializeParams = {
  email: string;
  /** Montant en francs CFA, tel qu'affiché à l'utilisateur. */
  amount: number;
  /** Référence de la commande ; elle sert de clé de rapprochement. */
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export type InitializeResult =
  | { success: true; authorizationUrl: string; reference: string }
  | { success: false; error: string };

/**
 * Crée une transaction et renvoie l'URL de paiement hébergée par Paystack.
 * Les canaux couvrent le mobile money ivoirien (Orange, MTN, Moov) et la carte.
 */
export async function initializeTransaction(
  params: InitializeParams
): Promise<InitializeResult> {
  try {
    const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: toSubunit(params.amount),
        currency: CURRENCY,
        reference: params.reference,
        callback_url: params.callbackUrl,
        channels: ['mobile_money', 'card'],
        metadata: params.metadata ?? {},
      }),
      cache: 'no-store',
    });

    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };

    if (!response.ok || !payload.status || !payload.data?.authorization_url) {
      console.error('[Paystack] ❌ Initialisation refusée :', payload.message);
      return {
        success: false,
        error: payload.message || "Paystack n'a pas pu initialiser le paiement.",
      };
    }

    return {
      success: true,
      authorizationUrl: payload.data.authorization_url,
      reference: payload.data.reference ?? params.reference,
    };
  } catch (error) {
    console.error('[Paystack] ❌ Appel impossible :', error);
    return { success: false, error: 'Service de paiement injoignable.' };
  }
}

export type VerifiedTransaction = {
  status: string;
  /** Montant réellement payé, reconverti en francs CFA. */
  amount: number;
  currency: string;
  reference: string;
};

/**
 * Interroge Paystack sur l'état réel d'une transaction.
 *
 * C'est la source de vérité : le contenu du webhook n'est jamais cru sur
 * parole, même après validation de sa signature.
 */
export async function verifyTransaction(
  reference: string
): Promise<VerifiedTransaction | null> {
  try {
    const response = await fetch(
      `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secretKey()}` },
        cache: 'no-store',
      }
    );

    const payload = (await response.json()) as {
      status?: boolean;
      data?: { status?: string; amount?: number; currency?: string; reference?: string };
    };

    if (!response.ok || !payload.status || !payload.data) return null;

    return {
      status: payload.data.status ?? 'unknown',
      amount: fromSubunit(payload.data.amount ?? 0),
      currency: payload.data.currency ?? CURRENCY,
      reference: payload.data.reference ?? reference,
    };
  } catch (error) {
    console.error('[Paystack] ❌ Vérification impossible :', error);
    return null;
  }
}

/**
 * Valide la signature d'un webhook.
 *
 * Paystack signe le corps brut de la requête en HMAC-SHA512 avec la clé
 * secrète. Le corps doit être comparé tel quel : le re-sérialiser après
 * analyse JSON modifierait les octets et invaliderait la signature.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;

  let expected: string;
  try {
    expected = createHmac('sha512', secretKey()).update(rawBody).digest('hex');
  } catch (error) {
    console.error('[Paystack] ❌ Signature non vérifiable :', error);
    return false;
  }

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
