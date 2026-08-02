import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Entretien périodique.
 *
 * Deux balayages, déclenchés une fois par jour par le planificateur de
 * l'hébergeur (`vercel.json`) :
 *  - clôture des commandes abandonnées en cours de paiement ;
 *  - purge des compteurs de limitation de débit dont la fenêtre est close.
 *
 * Le point d'entrée est public : il doit donc s'authentifier lui-même.
 * Vercel Cron présente `Authorization: Bearer $CRON_SECRET`.
 */

/** Délai au-delà duquel une commande en attente est considérée abandonnée. */
const ORDER_EXPIRY_HOURS = 24;

/** Ancienneté au-delà de laquelle un compteur de tentatives est inutile. */
const THROTTLE_RETENTION_HOURS = 24;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  // Sans secret configuré, l'entretien reste fermé : un point d'entrée capable
  // de modifier des commandes ne doit jamais être ouvert par défaut.
  if (!secret) {
    console.error('[Cron] ⛔ CRON_SECRET absente : entretien refusé.');
    return false;
  }

  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;

  const a = Buffer.from(header, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: expired, error: expiryError } = await supabase.rpc('expire_stale_orders', {
      p_hours: ORDER_EXPIRY_HOURS,
    });
    if (expiryError) throw new Error(`expire_stale_orders : ${expiryError.message}`);

    const { data: purged, error: purgeError } = await supabase.rpc('purge_auth_throttle', {
      p_hours: THROTTLE_RETENTION_HOURS,
    });
    if (purgeError) throw new Error(`purge_auth_throttle : ${purgeError.message}`);

    console.log(
      `[Cron] ✅ Entretien : ${expired ?? 0} commande(s) expirée(s), ${purged ?? 0} compteur(s) purgé(s).`
    );

    return NextResponse.json({
      status: 'ok',
      expiredOrders: expired ?? 0,
      purgedThrottleKeys: purged ?? 0,
    });
  } catch (error) {
    console.error('[Cron] ❌ Entretien échoué :', error);
    // Le détail reste dans les journaux : le renvoyer livrerait des noms de
    // contraintes ou de colonnes PostgreSQL à l'appelant.
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
