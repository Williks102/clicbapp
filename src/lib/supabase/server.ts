import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Client Supabase à privilèges élevés, réservé au serveur.
 *
 * La clé `service_role` contourne les politiques RLS : chaque Server Action
 * doit donc vérifier elle-même la session et le rôle avant d'écrire.
 *
 * L'instanciation est différée : les variables d'environnement ne sont pas
 * disponibles pendant le build, et leur absence ne doit pas empêcher la
 * compilation de l'application.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Configuration Supabase manquante : renseignez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}
