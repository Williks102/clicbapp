'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Client Supabase du navigateur (clé publique `anon`).
 *
 * Il est strictement en lecture : les politiques RLS n'autorisent que la
 * consultation des données publiques. Toutes les écritures passent par les
 * Server Actions.
 *
 * Retourne `null` si la configuration est absente, afin que l'interface
 * affiche un état d'erreur au lieu de planter au chargement du module.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error(
      '[Supabase] ⚠️ NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquante.'
    );
    return null;
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });

  return client;
}
