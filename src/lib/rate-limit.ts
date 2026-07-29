import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Limitation de débit de l'authentification.
 *
 * L'état vit en base et non en mémoire : les instances serverless ne partagent
 * rien et sont recyclées en permanence, si bien qu'un compteur en mémoire se
 * réinitialise à chaque démarrage à froid — précisément ce qu'un attaquant
 * provoque en étalant ses essais.
 */

export type RateLimitVerdict = {
  allowed: boolean;
  /** Secondes restantes avant réouverture de la fenêtre. */
  retryAfter: number;
};

/** Seuils par point d'entrée. */
export const LIMITS = {
  /** Connexion, par adresse IP : couvre le balayage de plusieurs comptes. */
  loginByIp: { max: 10, windowSeconds: 15 * 60 },
  /** Connexion, par e-mail : couvre l'essai de mots de passe sur un compte. */
  loginByEmail: { max: 5, windowSeconds: 15 * 60 },
  /** Inscription, par adresse IP : couvre la création de comptes en masse. */
  signupByIp: { max: 5, windowSeconds: 60 * 60 },
} as const;

type Limit = { max: number; windowSeconds: number };

/**
 * Enregistre une tentative et indique si elle est autorisée.
 *
 * En cas d'indisponibilité de la base, la tentative est **autorisée** : une
 * panne du compteur ne doit pas fermer la connexion à tout le monde. Le risque
 * est asymétrique — un blocage total est une panne certaine, un comptage
 * manquant n'est qu'une fenêtre d'attaque le temps de l'incident.
 */
export async function consumeRateLimit(key: string, limit: Limit): Promise<RateLimitVerdict> {
  try {
    const { data, error } = await getSupabaseAdmin().rpc('check_auth_rate_limit', {
      p_key: key,
      p_max: limit.max,
      p_window_seconds: limit.windowSeconds,
    });

    if (error) throw new Error(error.message);

    const verdict = data as { allowed: boolean; retry_after: number };
    return { allowed: verdict.allowed, retryAfter: verdict.retry_after };
  } catch (error) {
    console.error('[RATE LIMIT] ⚠️ Compteur indisponible, tentative autorisée :', error);
    return { allowed: true, retryAfter: 0 };
  }
}

/**
 * Efface le compteur d'une clé, après une authentification réussie.
 *
 * Sans cela, un utilisateur qui se trompe plusieurs fois de mot de passe
 * resterait pénalisé alors qu'il a fini par prouver son identité.
 */
export async function clearRateLimit(key: string): Promise<void> {
  try {
    await getSupabaseAdmin().rpc('reset_auth_rate_limit', { p_key: key });
  } catch (error) {
    console.error('[RATE LIMIT] ⚠️ Réinitialisation impossible :', error);
  }
}

/**
 * Adresse IP de l'appelant.
 *
 * `x-forwarded-for` est déclaratif et peut être falsifié par le client ;
 * derrière Vercel, la valeur fiable est celle que le proxy ajoute lui-même en
 * tête de liste. On préfère donc les en-têtes que seul l'hébergeur écrit, et
 * on ne retient que la première entrée — les suivantes sont fournies par le
 * client.
 */
export function clientIp(headers: Headers): string {
  const candidates = [
    headers.get('x-vercel-forwarded-for'),
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for'),
  ];

  for (const candidate of candidates) {
    const first = candidate?.split(',')[0]?.trim();
    if (first) return first;
  }

  return 'inconnue';
}

/** Formate un délai d'attente pour l'utilisateur. */
export function formatRetryAfter(seconds: number): string {
  if (seconds <= 60) return 'une minute';
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minutes`;
}
