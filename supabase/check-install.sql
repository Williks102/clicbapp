-- Vérifie que le schéma ClicVote est correctement installé.
-- À coller dans Supabase → SQL Editor. Chaque ligne doit afficher « OK ».

select
  'Tables' as element,
  count(*) || ' / 13' as trouve,
  case when count(*) = 13 then 'OK' else 'MANQUANT' end as etat
from information_schema.tables
where table_schema = 'public'
  and table_name in ('users','organizers','categories','competitions','vote_packs',
                     'candidates','orders','votes','free_vote_claims','live_access',
                     'chat_messages','transactions','platform_settings')

union all
select
  'Fonctions',
  count(*) || ' / 4',
  case when count(*) = 4 then 'OK' else 'MANQUANT' end
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('cast_free_vote','confirm_order_payment','replace_vote_packs','dashboard_stats')

union all
select
  'Triggers de comptage',
  count(*) || ' / 3',
  case when count(*) = 3 then 'OK' else 'MANQUANT' end
from pg_trigger
where not tgisinternal
  and tgname in ('votes_sync_counters','candidates_sync_count','orders_sync_revenue')

union all
select
  'RLS activée',
  count(*) || ' / 13',
  case when count(*) = 13 then 'OK' else 'INCOMPLET' end
from pg_tables
where schemaname = 'public' and rowsecurity

union all
select
  'Temps reel (replication)',
  count(*) || ' / 3',
  case when count(*) = 3 then 'OK' else 'A ACTIVER' end
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('competitions','candidates','chat_messages')

union all
select
  'Droits lecture (anon)',
  count(*) || ' / 6',
  case when count(*) = 6 then 'OK' else 'LANCER grants.sql' end
from information_schema.role_table_grants
where grantee = 'anon' and privilege_type = 'SELECT'
  and table_name in ('competitions','vote_packs','candidates',
                     'chat_messages','organizers','categories')

union all
select
  'Droits serveur (service_role)',
  count(*) || ' / 13',
  case when count(*) = 13 then 'OK' else 'LANCER grants.sql' end
from information_schema.role_table_grants
where grantee = 'service_role' and privilege_type = 'SELECT'
  and table_schema = 'public'

union all
select
  'Categories',
  count(*) || ' attendues : 9',
  case when count(*) >= 9 then 'OK' else 'LANCER seed.sql' end
from categories

union all
select
  'Comptes administrateur',
  count(*)::text,
  case when count(*) > 0 then 'OK' else 'AUCUN ADMIN' end
from users where role = 'admin';
