/*
 * Vérifications comportementales du vote facultatif.
 *
 *   psql -v ON_ERROR_STOP=1 -d clicvote -f supabase/tests/optional-voting.test.sql
 *
 * Chaque échec lève une exception : un retour sans erreur vaut succès.
 *
 * À exécuter sur une base fraîchement migrée. Le jeu d'essai utilise des
 * adresses fixes : un second passage sur la même base échoue sur l'unicité,
 * ce qui n'indique pas une régression.
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

create or replace function fails(p_sql text) returns boolean
language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end;
$$;

do $$
declare v_organizer uuid;
begin
  insert into users (name, email, password_hash, role)
  values ('Organisateur', 'orga@test.ci', 'x', 'organizer')
  returning id into v_organizer;
end;
$$;

\echo ''
\echo 'Un événement peut se passer de vote :'

do $$
declare
  v_orga uuid := (select id from users limit 1);
  v_id   uuid;
begin
  insert into competitions (title, description, organizer_id, category, cover_image,
                            voting_enabled, live_enabled, live_title, status)
  values ('Retransmission', 'Sans scrutin', v_orga, 'Sport', 'img',
          false, true, 'Finale', 'published')
  returning id into v_id;

  perform assert('création sans fenêtre de vote acceptée', v_id is not null);
  perform assert('fenêtre de vote absente',
    (select voting_starts_at is null and voting_ends_at is null
       from competitions where id = v_id));
end;
$$;

\echo ''
\echo 'Un concours exige toujours sa fenêtre de vote :'

do $$
declare v_orga uuid := (select id from users limit 1);
begin
  perform assert('vote activé sans dates refusé', fails(format($f$
    insert into competitions (title, description, organizer_id, category, cover_image,
                              voting_enabled, status)
    values ('Incomplet', 'desc', %L, 'Sport', 'img', true, 'draft')
  $f$, v_orga)));

  perform assert('ni vote ni diffusion refusé', fails(format($f$
    insert into competitions (title, description, organizer_id, category, cover_image,
                              voting_enabled, live_enabled, status)
    values ('Vide', 'desc', %L, 'Sport', 'img', false, false, 'draft')
  $f$, v_orga)));

  perform assert('clôture antérieure à l''ouverture refusée', fails(format($f$
    insert into competitions (title, description, organizer_id, category, cover_image,
                              voting_enabled, voting_starts_at, voting_ends_at, status)
    values ('Inversé', 'desc', %L, 'Sport', 'img', true,
            now() + interval '2 days', now(), 'draft')
  $f$, v_orga)));
end;
$$;

\echo ''
\echo 'Aucun vote gratuit sur un événement sans scrutin :'

do $$
declare
  v_orga uuid := (select id from users limit 1);
  v_comp uuid;
  v_cand uuid;
  v_user uuid;
begin
  insert into competitions (title, description, organizer_id, category, cover_image,
                            voting_enabled, live_enabled, live_title, status)
  values ('Direct pur', 'desc', v_orga, 'Sport', 'img', false, true, 'Finale', 'published')
  returning id into v_comp;

  -- Un candidat reste techniquement insérable ; c'est le vote qui doit être refusé.
  insert into candidates (competition_id, number, name)
  values (v_comp, 1, 'Candidat A') returning id into v_cand;

  insert into users (name, email, password_hash, role)
  values ('Votant', 'votant@test.ci', 'x', 'customer') returning id into v_user;

  perform assert('vote gratuit refusé', fails(format(
    'select * from cast_free_vote(%L, %L, %L)', v_user, v_comp, v_cand)));
  perform assert('aucun vote enregistré',
    (select count(*) from votes where competition_id = v_comp) = 0);
  perform assert('voting_is_open renvoie faux', voting_is_open(v_comp) = false);
end;
$$;

\echo ''
\echo 'Le vote gratuit reste opérationnel sur un concours :'

do $$
declare
  v_orga uuid := (select id from users limit 1);
  v_comp uuid;
  v_cand uuid;
  v_user uuid := (select id from users where email = 'votant@test.ci');
  v_count bigint;
begin
  insert into competitions (title, description, organizer_id, category, cover_image,
                            voting_enabled, voting_starts_at, voting_ends_at, status)
  values ('Concours', 'desc', v_orga, 'Sport', 'img', true,
          now() - interval '1 day', now() + interval '30 days', 'voting')
  returning id into v_comp;

  insert into candidates (competition_id, number, name)
  values (v_comp, 1, 'Candidat B') returning id into v_cand;

  select new_vote_count into v_count from cast_free_vote(v_user, v_comp, v_cand);

  perform assert('vote gratuit accepté', v_count = 1);
  perform assert('voting_is_open renvoie vrai', voting_is_open(v_comp) = true);
  perform assert('second vote immédiat refusé (délai d''attente)', fails(format(
    'select * from cast_free_vote(%L, %L, %L)', v_user, v_comp, v_cand)));
end;
$$;

\echo ''
\echo 'Statuts réservés au scrutin :'

do $$
declare v_orga uuid := (select id from users limit 1);
begin
  perform assert('statut « voting » refusé sans scrutin', fails(format($f$
    insert into competitions (title, description, organizer_id, category, cover_image,
                              voting_enabled, live_enabled, live_title, status)
    values ('Direct', 'desc', %L, 'Sport', 'img', false, true, 'Finale', 'voting')
  $f$, v_orga)));

  perform assert('statut « closed » refusé sans scrutin', fails(format($f$
    insert into competitions (title, description, organizer_id, category, cover_image,
                              voting_enabled, live_enabled, live_title, status)
    values ('Direct', 'desc', %L, 'Sport', 'img', false, true, 'Finale', 'closed')
  $f$, v_orga)));

  perform assert('statut « published » accepté sans scrutin', not fails(format($f$
    insert into competitions (title, description, organizer_id, category, cover_image,
                              voting_enabled, live_enabled, live_title, status)
    values ('Direct annoncé', 'desc', %L, 'Sport', 'img', false, true, 'Finale', 'published')
  $f$, v_orga)));

  perform assert('statut « finished » accepté sans scrutin', not fails(format($f$
    insert into competitions (title, description, organizer_id, category, cover_image,
                              voting_enabled, live_enabled, live_title, status)
    values ('Direct terminé', 'desc', %L, 'Sport', 'img', false, true, 'Finale', 'finished')
  $f$, v_orga)));
end;
$$;

\echo ''
\echo 'Code d''accès au direct :'

do $$
declare
  v_orga uuid := (select id from users limit 1);
  v_comp uuid;
  v_user uuid;
  v_a    text;
  v_b    text;
begin
  insert into competitions (title, description, organizer_id, category, cover_image,
                            voting_enabled, live_enabled, live_title, live_paid,
                            live_price, status)
  values ('Direct payant', 'desc', v_orga, 'Sport', 'img',
          false, true, 'Finale', true, 2000, 'published')
  returning id into v_comp;

  insert into users (name, email, password_hash, role)
  values ('Acheteur', 'acheteur@test.ci', 'x', 'customer') returning id into v_user;

  insert into live_access (user_id, competition_id, price_paid)
  values (v_user, v_comp, 2000) returning access_code into v_a;

  perform assert('code attribué automatiquement', v_a is not null);
  perform assert('format LIVE-XXXXX-XXXXX', v_a ~ '^LIVE-[0-9A-F]{5}-[0-9A-F]{5}$');

  -- Deux achats distincts ne peuvent pas partager un code.
  insert into users (name, email, password_hash, role)
  values ('Acheteur 2', 'acheteur2@test.ci', 'x', 'customer') returning id into v_user;
  insert into live_access (user_id, competition_id, price_paid)
  values (v_user, v_comp, 2000) returning access_code into v_b;

  perform assert('codes distincts entre deux achats', v_a <> v_b);
  perform assert('unicité imposée en base', fails(format(
    'update live_access set access_code = %L where access_code = %L', v_a, v_b)));

  perform assert('un compte n''achète pas deux fois le même direct', fails(format($f$
    insert into live_access (user_id, competition_id, price_paid)
    values (%L, %L, 2000)
  $f$, v_user, v_comp)));
end;
$$;

\echo ''
\echo 'Toutes les vérifications passent.'
