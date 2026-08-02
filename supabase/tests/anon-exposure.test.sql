/*
 * Ce que la clé publique du navigateur peut réellement lire.
 *
 *   psql -v ON_ERROR_STOP=1 -d clicvote -f supabase/tests/anon-exposure.test.sql
 *
 * À exécuter sur une base fraîchement migrée.
 *
 * Ces vérifications portent sur le rôle `anon`, dont la clé figure en clair
 * dans le code du site : tout ce qu'il peut lire est public de fait, quelles
 * que soient les précautions prises côté interface.
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

/** La requête échoue-t-elle, exécutée en tant qu'`anon` ? */
create or replace function anon_denied(p_sql text) returns boolean
language plpgsql as $$
begin
  set local role anon;
  execute p_sql;
  reset role;
  return false;
exception when others then
  reset role;
  return true;
end;
$$;

do $$
declare
  v_orga uuid;
  v_comp uuid;
begin
  insert into users (name, email, password_hash, role)
  values ('Organisateur', 'orga@test.ci', 'x', 'organizer')
  returning id into v_orga;

  insert into competitions (title, description, organizer_id, category, cover_image,
                            voting_enabled, live_enabled, live_title, live_url,
                            live_paid, live_price, status)
  values ('Direct payant', 'desc', v_orga, 'Sport', 'img', false, true, 'Finale',
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ', true, 2000, 'published')
  returning id into v_comp;

  insert into competitions (title, description, organizer_id, category, cover_image,
                            voting_enabled, voting_starts_at, voting_ends_at, status)
  values ('Brouillon', 'desc', v_orga, 'Sport', 'img', true,
          now(), now() + interval '10 days', 'draft');

  insert into chat_messages (competition_id, user_id, user_name, message, hidden)
  values (v_comp, v_orga, 'O', 'message modere', true),
         (v_comp, v_orga, 'O', 'message visible', false);
end;
$$;

\echo ''
\echo 'Le flux payant reste hors de portée du navigateur :'

do $$
begin
  perform assert('lecture de live_url refusée',
    anon_denied('select live_url from competitions'));
  perform assert('lecture de live_replay_url refusée',
    anon_denied('select live_replay_url from competitions'));
  perform assert('chiffre d''affaires non exposé',
    anon_denied('select total_revenue from competitions'));
  perform assert('select * refusé (il embarquerait ces colonnes)',
    anon_denied('select * from competitions'));
end;
$$;

\echo ''
\echo 'Les colonnes d''affichage restent lisibles :'

do $$
declare v_count int;
begin
  set local role anon;
  select count(*) into v_count
    from (select id, title, live_is_live, live_paid, live_price, status
            from competitions) t;
  reset role;

  perform assert('catalogue lisible', v_count = 1);
  perform assert('concours en brouillon invisible', v_count = 1);
end;
$$;

\echo ''
\echo 'La modération du chat est effective :'

do $$
declare
  v_total  int;
  v_hidden int;
begin
  set local role anon;
  select count(*) into v_total from chat_messages;
  select count(*) into v_hidden from chat_messages where message = 'message modere';
  reset role;

  perform assert('seul le message visible est servi', v_total = 1);
  perform assert('le message masqué est inaccessible', v_hidden = 0);
end;
$$;

\echo ''
\echo 'Les tables sensibles restent fermées :'

do $$
begin
  perform assert('users refusée',       anon_denied('select * from users'));
  perform assert('orders refusée',      anon_denied('select * from orders'));
  perform assert('votes refusée',       anon_denied('select * from votes'));
  perform assert('live_access refusée', anon_denied('select * from live_access'));
  perform assert('auth_throttle refusée', anon_denied('select * from auth_throttle'));
  perform assert('transactions refusée', anon_denied('select * from transactions'));
end;
$$;

\echo ''
\echo 'Le bannissement du chat est local à la diffusion :'

do $$
declare
  v_orga uuid := (select id from users where email = 'orga@test.ci');
  v_a    uuid := (select id from competitions where title = 'Direct payant');
  v_b    uuid;
  v_user uuid;
begin
  insert into competitions (title, description, organizer_id, category, cover_image,
                            voting_enabled, live_enabled, live_title, status)
  values ('Autre direct', 'desc', v_orga, 'Sport', 'img', false, true, 'B', 'published')
  returning id into v_b;

  insert into users (name, email, password_hash, role)
  values ('Spectateur', 'spec@test.ci', 'x', 'customer') returning id into v_user;

  insert into chat_bans (user_id, competition_id, banned_by) values (v_user, v_a, v_orga);

  perform assert('banni sur la diffusion visée',
    exists (select 1 from chat_bans where user_id = v_user and competition_id = v_a));
  perform assert('non banni sur les autres diffusions',
    not exists (select 1 from chat_bans where user_id = v_user and competition_id = v_b));
  perform assert('aucun bannissement global induit',
    (select not chat_banned from users where id = v_user));
  perform assert('liste des bannis non lisible par anon',
    anon_denied('select * from chat_bans'));
end;
$$;

\echo ''
\echo 'Toutes les vérifications passent.'
