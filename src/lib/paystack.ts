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

/**
 * Message affiché à l'acheteur quand la passerelle est mal configurée.
 * Le détail technique reste dans les journaux du serveur.
 */
const CONFIG_ERROR =
  "Le service de paiement n'est pas correctement configuré. " +
  "Merci de réessayer plus tard ou de contacter l'organisateur.";

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

/**
 * Clé secrète Paystack, contrôlée avant tout appel.
 *
 * Paystack répond « Invalid key » sans distinguer les causes. Ces contrôles
 * les séparent côté serveur : clé absente, clé publique copiée à la place de
 * la clé secrète, ou espaces conservés lors du copier-coller.
 */
function secretKey(): string {
  const raw = process.env.PAYSTACK_SECRET_KEY;
  if (!raw) {
    throw new Error(
      'PAYSTACK_SECRET_KEY manquante : impossible de contacter Paystack.'
    );
  }

  // Un saut de ligne ou une espace collée avec la clé suffit à la faire
  // rejeter ; l'en-tête Authorization les transmet tels quels.
  const key = raw.trim();

  if (key.startsWith('pk_')) {
    throw new Error(
      'PAYSTACK_SECRET_KEY contient une clé publique (pk_…). ' +
        'Paystack attend la clé secrète (sk_test_… ou sk_live_…).'
    );
  }

  if (!key.startsWith('sk_')) {
    throw new Error(
      'PAYSTACK_SECRET_KEY ne ressemble pas à une clé Paystack : ' +
        'elle doit commencer par sk_test_ ou sk_live_.'
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
  // Hors du try : une clé mal configurée doit être signalée comme telle, et
  // non confondue avec une panne réseau.
  let key: string;
  try {
    key = secretKey();
  } catch (error) {
    console.error('[Paystack] ❌ Configuration :', error);
    return { success: false, error: CONFIG_ERROR };
  }

  try {
    const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
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
      console.error(
        `[Paystack] ❌ Initialisation refusée (HTTP ${response.status}) :`,
        payload.message
      );

      // 401 : la clé elle-même est rejetée. C'est un défaut de configuration
      // de la plateforme, pas une erreur imputable à l'acheteur — inutile de
      // lui montrer le message brut de Paystack.
      if (response.status === 401) {
        return { success: false, error: CONFIG_ERROR };
      }

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

export type CredentialCheck =
  | { ok: true; mode: 'test' | 'live' }
  | { ok: false; reason: string };

/**
 * Vérifie que la clé secrète est acceptée par Paystack.
 *
 * Interroge `/balance`, le point d'entrée authentifié le plus léger : il ne
 * crée rien et ne dépend d'aucune transaction existante. Réservé à
 * l'administration — il sert à diagnostiquer un « Invalid key » sans avoir à
 * lancer un vrai paiement.
 */
export async function checkCredentials(): Promise<CredentialCheck> {
  let key: string;
  try {
    key = secretKey();
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Clé illisible.',
    };
  }

  try {
    const response = await fetch(`${PAYSTACK_API}/balance`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });

    if (response.status === 401) {
      return {
        ok: false,
        reason:
          'Paystack rejette la clé (« Invalid key »). Elle est incomplète, ' +
          'révoquée, ou provient d’un autre compte.',
      };
    }

    if (!response.ok) {
      return { ok: false, reason: `Paystack a répondu HTTP ${response.status}.` };
    }

    return { ok: true, mode: key.startsWith('sk_live_') ? 'live' : 'test' };
  } catch (error) {
    console.error('[Paystack] ❌ Vérification de la clé impossible :', error);
    return { ok: false, reason: 'API Paystack injoignable depuis le serveur.' };
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
