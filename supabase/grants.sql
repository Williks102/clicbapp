-- ============================================================
-- ClicVote — Droits d'accès des rôles Supabase
-- ============================================================
--
-- Les politiques RLS décident *quelles lignes* un rôle peut voir ; les
-- privilèges ci-dessous décident s'il peut accéder à la table tout court.
-- Les deux sont nécessaires : sans GRANT, PostgreSQL refuse la requête avant
-- même d'évaluer la politique.
--
-- Ce fichier est rejouable sans risque. Il est inclus à la fin de la migration
-- initiale ; exécutez-le seul si une base a été créée avant son ajout.

-- ---------- Navigateur (clé anon) : lecture des données publiques ----------
-- Le filtrage ligne à ligne reste assuré par les politiques RLS : les
-- brouillons, par exemple, restent invisibles malgré ce GRANT.

grant usage on schema public to anon, service_role;

grant select on
  competitions,
  vote_packs,
  candidates,
  chat_messages,
  organizers,
  categories
to anon;

-- Aucun privilège n'est accordé à `anon` sur users, orders, votes,
-- free_vote_claims, live_access, transactions et platform_settings : ces
-- tables lui sont inaccessibles, indépendamment de toute politique.

-- ---------- Serveur (clé service_role) : accès complet ----------
-- `service_role` contourne la RLS, mais reste soumis aux privilèges de table.

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Les fonctions métier sont appelées par le serveur uniquement.
grant execute on function
  cast_free_vote(uuid, uuid, uuid),
  confirm_order_payment(text, numeric, jsonb),
  replace_vote_packs(uuid, jsonb),
  dashboard_stats(uuid),
  organizer_payouts()
to service_role;

revoke execute on function
  cast_free_vote(uuid, uuid, uuid),
  confirm_order_payment(text, numeric, jsonb),
  replace_vote_packs(uuid, jsonb),
  dashboard_stats(uuid),
  organizer_payouts()
from public, anon;

-- ---------- Objets créés ultérieurement ----------
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
