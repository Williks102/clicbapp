/*
 * Vérifications comportementales de l'expiration des commandes et de la
 * limitation de débit.
 *
 * Exécution sur une base fraîchement migrée :
 *   psql -v ON_ERROR_STOP=1 -d clicvote -f supabase/tests/expiry-and-rate-limit.test.sql
 *
 * Chaque échec lève une exception : un retour sans erreur vaut succès.
 */

\set QUIET on
\pset pager off

create or replace function assert(p_label text, p_condition boolean)
returns void language plpgsql as $$
begin
  if p_condition then
    raise notice '  OK   %', p_label;
  else
    raise exception 'ECHEC : %', p_label;
  end if;
end;
$$;

-- ==================== Jeu d'essai ====================

do $$
declare
  v_organizer uuid;
  v_comp      uuid;
  v_cand      uuid;
begin
  insert into users (name, email, password_hash, role)
  values ('Organisateur', 'orga@test.ci', 'x', 'organizer')
  returning id into v_organizer;

  insert into competitions (title, description, organizer_id, organizer_name,
                            category, cover_image,
                            voting_starts_at, voting_ends_at, status)
  values ('Concours test', 'Description', v_organizer, 'Organisateur',
          'Test', 'image',
          now() - interval '1 day', now() + interval '30 days', 'voting')
  returning id into v_comp;

  insert into candidates (competition_id, number, name)
  values (v_comp, 1, 'Candidat A')
  returning id into v_cand;

  -- Commandes couvrant les cas d'expiration.
  insert into orders (id, type, competition_id, competition_title, organizer_id,
                      candidate_id, candidate_name, votes, amount,
                      customer_name, customer_email, status, created_at)
  values
    ('ORD-vieille',  'VOTE_PACK', v_comp, 'Concours test', v_organizer,
     v_cand, 'Candidat A', 50, 2000, 'Client', 'client@test.ci', 'PENDING',
     now() - interval '48 hours'),
    ('ORD-recente',  'VOTE_PACK', v_comp, 'Concours test', v_organizer,
     v_cand, 'Candidat A', 50, 2000, 'Client', 'client@test.ci', 'PENDING',
     now() - interval '1 hour'),
    ('ORD-payee',    'VOTE_PACK', v_comp, 'Concours test', v_organizer,
     v_cand, 'Candidat A', 50, 2000, 'Client', 'client@test.ci', 'PAID',
     now() - interval '48 hours'),
    ('ORD-echouee',  'VOTE_PACK', v_comp, 'Concours test', v_organizer,
     v_cand, 'Candidat A', 50, 2000, 'Client', 'client@test.ci', 'FAILED',
     now() - interval '48 hours');
end;
$$;

-- ==================== Expiration ====================

\echo ''
\echo 'Expiration des commandes en attente :'

do $$
declare
  v_count int;
begin
  v_count := expire_stale_orders(24);

  perform assert('une seule commande expirée', v_count = 1);
  perform assert('commande ancienne expirée',
    (select status from orders where id = 'ORD-vieille') = 'EXPIRED');
  perform assert('commande récente intacte',
    (select status from orders where id = 'ORD-recente') = 'PENDING');
  perform assert('commande payée intacte',
    (select status from orders where id = 'ORD-payee') = 'PAID');
  perform assert('commande échouée intacte',
    (select status from orders where id = 'ORD-echouee') = 'FAILED');

  perform assert('balayage répété sans effet', expire_stale_orders(24) = 0);
end;
$$;

-- ==================== Réversibilité ====================

\echo ''
\echo 'Un paiement tardif crédite une commande expirée :'

do $$
declare
  v_outcome text;
  v_votes   int;
begin
  v_outcome := confirm_order_payment('ORD-vieille', 2000, '{"source":"test"}'::jsonb);

  perform assert('commande expirée créditée', v_outcome = 'paid');
  perform assert('statut repassé à PAID',
    (select status from orders where id = 'ORD-vieille') = 'PAID');

  select quantity into v_votes from votes where order_id = 'ORD-vieille';
  perform assert('votes enregistrés', v_votes = 50);

  perform assert('compteur du candidat mis à jour',
    (select vote_count from candidates
      where id = (select candidate_id from orders where id = 'ORD-vieille')) = 50);
  perform assert('votes comptés comme payants',
    (select paid_vote_count from candidates
      where id = (select candidate_id from orders where id = 'ORD-vieille')) = 50);

  -- Idempotence : le rejeu ne doit rien recréditer.
  perform assert('rejeu refusé',
    confirm_order_payment('ORD-vieille', 2000, '{}'::jsonb) = 'already_processed');
  perform assert('votes non dupliqués',
    (select count(*) from votes where order_id = 'ORD-vieille') = 1);
end;
$$;

\echo ''
\echo 'Les états définitifs restent fermés :'

do $$
begin
  perform assert('commande payée non rouverte',
    confirm_order_payment('ORD-payee', 2000, '{}'::jsonb) = 'already_processed');
  perform assert('commande échouée non rouverte',
    confirm_order_payment('ORD-echouee', 2000, '{}'::jsonb) = 'already_processed');
  perform assert('commande inconnue signalée',
    confirm_order_payment('ORD-inexistante', 2000, '{}'::jsonb) = 'not_found');
end;
$$;

\echo ''
\echo 'Un montant incohérent ne crédite jamais :'

do $$
begin
  perform assert('montant divergent signalé',
    confirm_order_payment('ORD-recente', 999, '{}'::jsonb) = 'amount_mismatch');
  perform assert('commande basculée en FLAGGED',
    (select status from orders where id = 'ORD-recente') = 'FLAGGED');
  perform assert('aucun vote crédité',
    (select count(*) from votes where order_id = 'ORD-recente') = 0);
end;
$$;

-- ==================== Limitation de débit ====================

\echo ''
\echo 'Limitation de débit :'

do $$
declare
  v_result jsonb;
  i        int;
begin
  -- Trois tentatives autorisées sur une fenêtre de 60 secondes.
  for i in 1..3 loop
    v_result := check_auth_rate_limit('login:ip:203.0.113.1', 3, 60);
    perform assert(format('tentative %s autorisée', i), (v_result->>'allowed')::boolean);
  end loop;

  v_result := check_auth_rate_limit('login:ip:203.0.113.1', 3, 60);
  perform assert('quatrième tentative refusée', not (v_result->>'allowed')::boolean);
  perform assert('délai de réouverture communiqué', (v_result->>'retry_after')::int > 0);
  perform assert('tentatives comptées', (v_result->>'attempts')::int = 4);

  -- Une autre clé n'est pas affectée.
  v_result := check_auth_rate_limit('login:ip:203.0.113.2', 3, 60);
  perform assert('clé distincte indépendante', (v_result->>'allowed')::boolean);

  -- Une authentification réussie efface le compteur.
  perform reset_auth_rate_limit('login:ip:203.0.113.1');
  v_result := check_auth_rate_limit('login:ip:203.0.113.1', 3, 60);
  perform assert('compteur remis à zéro après réussite',
    (v_result->>'allowed')::boolean and (v_result->>'attempts')::int = 1);
end;
$$;

\echo ''
\echo 'La fenêtre glissante se rouvre :'

do $$
declare
  v_result jsonb;
begin
  perform check_auth_rate_limit('login:ip:203.0.113.3', 1, 60);
  v_result := check_auth_rate_limit('login:ip:203.0.113.3', 1, 60);
  perform assert('seuil atteint', not (v_result->>'allowed')::boolean);

  -- On recule artificiellement la fenêtre au-delà de sa durée.
  update auth_throttle set window_start = now() - interval '61 seconds'
   where key = 'login:ip:203.0.113.3';

  v_result := check_auth_rate_limit('login:ip:203.0.113.3', 1, 60);
  perform assert('nouvelle fenêtre autorisée', (v_result->>'allowed')::boolean);
  perform assert('compteur réinitialisé', (v_result->>'attempts')::int = 1);
end;
$$;

\echo ''
\echo 'Purge des compteurs :'

do $$
begin
  update auth_throttle set window_start = now() - interval '48 hours'
   where key = 'login:ip:203.0.113.2';

  perform assert('compteur ancien purgé', purge_auth_throttle(24) = 1);
  perform assert('compteur récent conservé',
    (select count(*) from auth_throttle where key = 'login:ip:203.0.113.1') = 1);
end;
$$;

\echo ''
\echo 'Toutes les vérifications passent.'
