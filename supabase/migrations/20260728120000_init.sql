-- ============================================================
-- ClicVote — Schéma initial (PostgreSQL / Supabase)
-- ============================================================
--
-- Modèle de sécurité
-- ------------------
-- L'authentification repose sur NextAuth : les requêtes du navigateur portent
-- la clé `anon` et ne sont jamais associées à un utilisateur Postgres. Le rôle
-- `anon` n'a donc que des droits de LECTURE, limités aux données publiques.
-- Toutes les écritures passent par les Server Actions, qui utilisent la clé
-- `service_role` (laquelle contourne RLS) après avoir vérifié session et rôle.
--
-- Intégrité
-- ---------
-- Les compteurs de votes ne sont jamais calculés par l'application : ils sont
-- maintenus par des triggers, donc toujours cohérents avec la table `votes`.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ==================== TYPES ====================

create type user_role as enum ('customer', 'organizer', 'admin');
create type competition_status as enum ('draft', 'published', 'voting', 'closed', 'finished');
create type live_provider as enum ('youtube', 'facebook', 'vimeo', 'hls', 'iframe');
create type vote_type as enum ('free', 'paid');
create type order_type as enum ('VOTE_PACK', 'LIVE_ACCESS');
create type order_status as enum ('PENDING', 'PAID', 'FAILED', 'FLAGGED', 'REFUNDED');

-- ==================== UTILISATEURS ====================

create table users (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  -- citext : deux comptes ne peuvent pas différer par la seule casse.
  email                     citext not null unique,
  password_hash             text not null,
  role                      user_role not null default 'customer',
  avatar                    text,
  bio                       text,
  notification_preferences  jsonb not null default '{"emailNotifications": true, "platformUpdates": true}'::jsonb,
  chat_banned               boolean not null default false,
  disabled                  boolean not null default false,
  deleted                   boolean not null default false,
  deleted_at                timestamptz,
  created_at                timestamptz not null default now()
);

-- Profil public d'un organisateur, dissocié du compte pour ne pas exposer
-- l'e-mail ni le hachage du mot de passe.
create table organizers (
  id      uuid primary key references users(id) on delete cascade,
  name    text not null,
  bio     text not null default '',
  avatar  text not null default 'organizer-1'
);

create table categories (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

-- ==================== CONCOURS ====================

create table competitions (
  id                       uuid primary key default gen_random_uuid(),
  organizer_id             uuid not null references users(id) on delete cascade,
  organizer_name           text,
  title                    text not null,
  category                 text not null,
  description              text not null default '',
  cover_image              text not null default '',
  status                   competition_status not null default 'draft',
  voting_starts_at         timestamptz not null,
  voting_ends_at           timestamptz not null,
  hide_results             boolean not null default false,
  winner_candidate_id      uuid,

  free_vote_enabled        boolean not null default true,
  free_vote_cooldown_hours integer not null default 24
                             check (free_vote_cooldown_hours between 1 and 720),

  live_enabled             boolean not null default false,
  live_title               text not null default '',
  live_provider            live_provider not null default 'youtube',
  live_url                 text not null default '',
  live_is_live             boolean not null default false,
  live_scheduled_at        timestamptz,
  live_paid                boolean not null default false,
  live_price               numeric(12, 2) not null default 0 check (live_price >= 0),
  live_chat_enabled        boolean not null default true,
  live_replay_url          text not null default '',

  -- Compteurs maintenus par trigger (voir plus bas). Jamais écrits par l'app.
  total_votes              bigint not null default 0,
  free_votes               bigint not null default 0,
  paid_votes               bigint not null default 0,
  total_revenue            numeric(14, 2) not null default 0,
  candidates_count         integer not null default 0,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint voting_window_is_ordered check (voting_ends_at > voting_starts_at),
  constraint paid_live_needs_a_price check (not live_paid or live_price > 0)
);

create index competitions_public_idx on competitions (status) where status <> 'draft';
create index competitions_organizer_idx on competitions (organizer_id, created_at desc);
create index competitions_live_idx on competitions (live_is_live) where live_is_live;

create table vote_packs (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid not null references competitions(id) on delete cascade,
  name            text not null,
  votes           integer not null check (votes > 0),
  price           numeric(12, 2) not null check (price > 0),
  highlighted     boolean not null default false,
  position        integer not null default 0
);

create index vote_packs_competition_idx on vote_packs (competition_id, position);

-- ==================== CANDIDATS ====================

create table candidates (
  id               uuid primary key default gen_random_uuid(),
  competition_id   uuid not null references competitions(id) on delete cascade,
  name             text not null,
  number           integer not null check (number > 0),
  photo            text not null default '',
  bio              text not null default '',
  city             text not null default '',
  -- Compteurs maintenus par trigger.
  vote_count       bigint not null default 0,
  free_vote_count  bigint not null default 0,
  paid_vote_count  bigint not null default 0,
  eliminated       boolean not null default false,
  created_at       timestamptz not null default now(),

  -- Rend structurellement impossible le doublon de dossard que l'ancien
  -- contrôle « lecture puis écriture » laissait passer en cas de concurrence.
  constraint candidate_number_is_unique_per_competition
    unique (competition_id, number)
);

create index candidates_leaderboard_idx
  on candidates (competition_id, vote_count desc, number asc);

alter table competitions
  add constraint competitions_winner_fk
  foreign key (winner_candidate_id) references candidates(id) on delete set null;

-- ==================== COMMANDES ====================

create table orders (
  -- L'identifiant est la référence de paiement transmise à Paiement Pro.
  id                 text primary key,
  type               order_type not null,
  competition_id     uuid not null references competitions(id) on delete cascade,
  competition_title  text not null,
  organizer_id       uuid not null references users(id) on delete cascade,
  candidate_id       uuid references candidates(id) on delete set null,
  candidate_name     text,
  pack_id            uuid references vote_packs(id) on delete set null,
  pack_name          text,
  votes              integer check (votes is null or votes > 0),
  amount             numeric(12, 2) not null check (amount > 0),
  customer_name      text not null,
  customer_email     citext not null,
  customer_phone     text,
  user_id            uuid references users(id) on delete set null,
  status             order_status not null default 'PENDING',
  payment_details    jsonb,
  refund_reason      text,
  refunded_at        timestamptz,
  refunded_by        uuid references users(id) on delete set null,
  created_at         timestamptz not null default now(),
  paid_at            timestamptz,

  -- Une commande de votes doit désigner un candidat et une quantité.
  constraint vote_order_is_complete check (
    type <> 'VOTE_PACK' or (candidate_id is not null and votes is not null)
  ),
  -- Un accès au direct est nominatif.
  constraint live_order_needs_a_user check (
    type <> 'LIVE_ACCESS' or user_id is not null
  )
);

create index orders_organizer_idx on orders (organizer_id, created_at desc);
create index orders_customer_idx on orders (customer_email, created_at desc);
create index orders_competition_idx on orders (competition_id, created_at desc);
create index orders_status_idx on orders (status);

-- ==================== VOTES ====================

create table votes (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid not null references competitions(id) on delete cascade,
  candidate_id    uuid not null references candidates(id) on delete cascade,
  candidate_name  text not null,
  user_id         uuid references users(id) on delete set null,
  voter_email     citext,
  voter_name      text,
  quantity        integer not null check (quantity > 0),
  type            vote_type not null,
  -- Unique : un webhook rejoué ne peut pas créditer deux fois la même commande.
  order_id        text unique references orders(id) on delete set null,
  created_at      timestamptz not null default now(),

  constraint paid_vote_has_an_order check (type <> 'paid' or order_id is not null)
);

create index votes_competition_idx on votes (competition_id, created_at desc);
create index votes_candidate_idx on votes (candidate_id, created_at desc);
create index votes_user_idx on votes (user_id, created_at desc);

-- Suivi du vote gratuit : une ligne par utilisateur et par concours.
create table free_vote_claims (
  user_id          uuid not null references users(id) on delete cascade,
  competition_id   uuid not null references competitions(id) on delete cascade,
  last_voted_at    timestamptz not null default now(),
  total_free_votes integer not null default 0,
  primary key (user_id, competition_id)
);

-- ==================== DIFFUSION EN DIRECT ====================

create table live_access (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  competition_id uuid not null references competitions(id) on delete cascade,
  order_id       text unique references orders(id) on delete set null,
  price_paid     numeric(12, 2) not null default 0,
  purchase_date  timestamptz not null default now(),

  constraint live_access_is_granted_once unique (user_id, competition_id)
);

create table chat_messages (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  user_id        uuid not null references users(id) on delete cascade,
  user_name      text not null,
  user_role      user_role not null default 'customer',
  message        text not null check (length(message) between 1 and 300),
  hidden         boolean not null default false,
  created_at     timestamptz not null default now()
);

create index chat_messages_feed_idx on chat_messages (competition_id, created_at desc);
create index chat_messages_rate_limit_idx on chat_messages (competition_id, user_id, created_at desc);

-- ==================== FINANCE ====================

create table transactions (
  id           uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references users(id) on delete cascade,
  order_id     text references orders(id) on delete set null,
  amount       numeric(14, 2) not null,
  type         text not null check (type in ('payout', 'refund', 'commission')),
  status       text not null default 'paid' check (status in ('pending', 'processing', 'paid')),
  description  text not null default '',
  created_by   uuid references users(id) on delete set null,
  date         timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index transactions_organizer_idx on transactions (organizer_id, date desc);

create table platform_settings (
  id                         text primary key default 'default',
  platform_fee_percentage    numeric(5, 2) not null default 5
                               check (platform_fee_percentage between 0 and 100),
  transaction_fee_percentage numeric(5, 2) not null default 2.5
                               check (transaction_fee_percentage between 0 and 100),
  updated_at                 timestamptz not null default now(),
  updated_by                 uuid references users(id) on delete set null
);

insert into platform_settings (id) values ('default');

-- ==================== COMPTEURS (TRIGGERS) ====================

-- Chaque vote inséré met à jour le candidat et le concours. L'application
-- n'a plus aucun compteur à maintenir : la dérive devient impossible.
create or replace function sync_vote_counters() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update candidates set
      vote_count      = vote_count + new.quantity,
      free_vote_count = free_vote_count + case when new.type = 'free' then new.quantity else 0 end,
      paid_vote_count = paid_vote_count + case when new.type = 'paid' then new.quantity else 0 end
    where id = new.candidate_id;

    update competitions set
      total_votes = total_votes + new.quantity,
      free_votes  = free_votes + case when new.type = 'free' then new.quantity else 0 end,
      paid_votes  = paid_votes + case when new.type = 'paid' then new.quantity else 0 end
    where id = new.competition_id;

  elsif tg_op = 'DELETE' then
    update candidates set
      vote_count      = greatest(vote_count - old.quantity, 0),
      free_vote_count = greatest(free_vote_count - case when old.type = 'free' then old.quantity else 0 end, 0),
      paid_vote_count = greatest(paid_vote_count - case when old.type = 'paid' then old.quantity else 0 end, 0)
    where id = old.candidate_id;

    update competitions set
      total_votes = greatest(total_votes - old.quantity, 0),
      free_votes  = greatest(free_votes - case when old.type = 'free' then old.quantity else 0 end, 0),
      paid_votes  = greatest(paid_votes - case when old.type = 'paid' then old.quantity else 0 end, 0)
    where id = old.competition_id;
  end if;

  return null;
end;
$$;

create trigger votes_sync_counters
  after insert or delete on votes
  for each row execute function sync_vote_counters();

create or replace function sync_candidate_count() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update competitions set candidates_count = candidates_count + 1
    where id = new.competition_id;
  else
    update competitions set candidates_count = greatest(candidates_count - 1, 0)
    where id = old.competition_id;
  end if;
  return null;
end;
$$;

create trigger candidates_sync_count
  after insert or delete on candidates
  for each row execute function sync_candidate_count();

-- Le chiffre d'affaires d'un concours suit les passages en statut PAID.
create or replace function sync_competition_revenue() returns trigger
language plpgsql as $$
begin
  if new.status = 'PAID' and old.status is distinct from 'PAID' then
    update competitions set total_revenue = total_revenue + new.amount
    where id = new.competition_id;
  elsif old.status = 'PAID' and new.status is distinct from 'PAID' then
    update competitions set total_revenue = greatest(total_revenue - old.amount, 0)
    where id = new.competition_id;
  end if;
  return null;
end;
$$;

create trigger orders_sync_revenue
  after update of status on orders
  for each row execute function sync_competition_revenue();

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger competitions_touch_updated_at
  before update on competitions
  for each row execute function touch_updated_at();

-- ==================== OPÉRATIONS ATOMIQUES ====================

/**
 * Enregistre un vote gratuit.
 *
 * Le respect du délai d'attente et l'enregistrement du vote se font dans la
 * même transaction : deux requêtes simultanées ne peuvent pas produire deux
 * votes gratuits. Le `where` de la clause `on conflict` porte tout le contrôle
 * de concurrence — si le délai n'est pas écoulé, aucune ligne n'est renvoyée.
 */
create or replace function cast_free_vote(
  p_user_id        uuid,
  p_competition_id uuid,
  p_candidate_id   uuid
) returns table (new_vote_count bigint, next_free_vote_at timestamptz)
language plpgsql as $$
declare
  v_competition competitions%rowtype;
  v_candidate   candidates%rowtype;
  v_user        users%rowtype;
  v_claimed     timestamptz;
begin
  select * into v_competition from competitions where id = p_competition_id;
  if not found then
    raise exception 'COMPETITION_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_candidate from candidates where id = p_candidate_id;
  if not found or v_candidate.competition_id <> p_competition_id then
    raise exception 'CANDIDATE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_candidate.eliminated then
    raise exception 'CANDIDATE_ELIMINATED' using errcode = 'P0001';
  end if;

  if not v_competition.free_vote_enabled then
    raise exception 'FREE_VOTE_DISABLED' using errcode = 'P0001';
  end if;

  if v_competition.status <> 'voting'
     or now() < v_competition.voting_starts_at
     or now() > v_competition.voting_ends_at then
    raise exception 'VOTING_CLOSED' using errcode = 'P0001';
  end if;

  select * into v_user from users where id = p_user_id;
  if not found or v_user.disabled or v_user.deleted then
    raise exception 'USER_NOT_ALLOWED' using errcode = 'P0001';
  end if;

  insert into free_vote_claims (user_id, competition_id, last_voted_at, total_free_votes)
  values (p_user_id, p_competition_id, now(), 1)
  on conflict (user_id, competition_id) do update
    set last_voted_at    = now(),
        total_free_votes = free_vote_claims.total_free_votes + 1
    where free_vote_claims.last_voted_at
          <= now() - make_interval(hours => v_competition.free_vote_cooldown_hours)
  returning last_voted_at into v_claimed;

  if v_claimed is null then
    raise exception 'FREE_VOTE_COOLDOWN' using errcode = 'P0001';
  end if;

  insert into votes (competition_id, candidate_id, candidate_name, user_id,
                     voter_email, voter_name, quantity, type)
  values (p_competition_id, p_candidate_id, v_candidate.name, p_user_id,
          v_user.email, v_user.name, 1, 'free');

  return query
    select c.vote_count,
           v_claimed + make_interval(hours => v_competition.free_vote_cooldown_hours)
    from candidates c where c.id = p_candidate_id;
end;
$$;

/**
 * Confirme le paiement d'une commande et en applique les effets.
 *
 * Idempotente : un webhook rejoué renvoie « already_processed » sans jamais
 * créditer deux fois. Le montant est revalidé côté base.
 */
create or replace function confirm_order_payment(
  p_order_id         text,
  p_paid_amount      numeric,
  p_payment_details  jsonb
) returns text
language plpgsql as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    return 'not_found';
  end if;

  if v_order.status <> 'PENDING' then
    return 'already_processed';
  end if;

  if p_paid_amount is distinct from v_order.amount then
    update orders set status = 'FLAGGED', payment_details = p_payment_details
    where id = p_order_id;
    return 'amount_mismatch';
  end if;

  if v_order.type = 'VOTE_PACK' then
    insert into votes (competition_id, candidate_id, candidate_name, user_id,
                       voter_email, voter_name, quantity, type, order_id)
    values (v_order.competition_id, v_order.candidate_id, coalesce(v_order.candidate_name, ''),
            v_order.user_id, v_order.customer_email, v_order.customer_name,
            v_order.votes, 'paid', v_order.id)
    on conflict (order_id) do nothing;
  else
    insert into live_access (user_id, competition_id, order_id, price_paid)
    values (v_order.user_id, v_order.competition_id, v_order.id, v_order.amount)
    on conflict (user_id, competition_id) do nothing;
  end if;

  update orders
     set status = 'PAID', paid_at = now(), payment_details = p_payment_details
   where id = p_order_id;

  return 'paid';
end;
$$;

/**
 * Remplace l'ensemble des packs d'un concours.
 * Les packs absents de la nouvelle liste sont supprimés ; les commandes
 * passées conservent leur historique grâce au `on delete set null`.
 */
create or replace function replace_vote_packs(
  p_competition_id uuid,
  p_packs          jsonb
) returns void
language plpgsql as $$
declare
  v_kept uuid[];
begin
  with input as (
    select
      nullif(pack->>'id', '')::uuid as id,
      pack->>'name'                 as name,
      (pack->>'votes')::integer     as votes,
      (pack->>'price')::numeric     as price,
      coalesce((pack->>'highlighted')::boolean, false) as highlighted,
      ordinality - 1                as position
    from jsonb_array_elements(p_packs) with ordinality as t(pack, ordinality)
  ),
  upserted as (
    insert into vote_packs (id, competition_id, name, votes, price, highlighted, position)
    select coalesce(input.id, gen_random_uuid()), p_competition_id,
           input.name, input.votes, input.price, input.highlighted, input.position
    from input
    on conflict (id) do update
      set name        = excluded.name,
          votes       = excluded.votes,
          price       = excluded.price,
          highlighted = excluded.highlighted,
          position    = excluded.position
    returning id
  )
  select array_agg(id) into v_kept from upserted;

  delete from vote_packs
   where competition_id = p_competition_id
     and not (id = any(coalesce(v_kept, '{}'::uuid[])));
end;
$$;

-- ==================== SÉCURITÉ (RLS) ====================
--
-- `service_role` contourne RLS : les Server Actions ne sont pas concernées.
-- Les politiques ci-dessous ne régissent que le rôle `anon`, c'est-à-dire le
-- navigateur, qui ne doit jamais écrire.

alter table users             enable row level security;
alter table organizers        enable row level security;
alter table categories        enable row level security;
alter table competitions      enable row level security;
alter table vote_packs        enable row level security;
alter table candidates        enable row level security;
alter table orders            enable row level security;
alter table votes             enable row level security;
alter table free_vote_claims  enable row level security;
alter table live_access       enable row level security;
alter table chat_messages     enable row level security;
alter table transactions      enable row level security;
alter table platform_settings enable row level security;

-- Lectures publiques : uniquement ce qu'affiche le site.
create policy published_competitions_are_public on competitions
  for select to anon using (status <> 'draft');

create policy packs_of_published_competitions_are_public on vote_packs
  for select to anon using (
    exists (select 1 from competitions c where c.id = competition_id and c.status <> 'draft')
  );

create policy candidates_of_published_competitions_are_public on candidates
  for select to anon using (
    exists (select 1 from competitions c where c.id = competition_id and c.status <> 'draft')
  );

create policy chat_of_published_competitions_is_public on chat_messages
  for select to anon using (
    exists (select 1 from competitions c where c.id = competition_id and c.status <> 'draft')
  );

create policy organizer_profiles_are_public on organizers
  for select to anon using (true);

create policy categories_are_public on categories
  for select to anon using (true);

-- Aucune politique n'est définie pour users, orders, votes, free_vote_claims,
-- live_access, transactions et platform_settings : avec RLS activé, l'absence
-- de politique vaut refus total pour `anon`.

-- ==================== TEMPS RÉEL ====================
-- Seules les tables réellement écoutées par le navigateur sont répliquées.

alter publication supabase_realtime add table competitions;
alter publication supabase_realtime add table candidates;
alter publication supabase_realtime add table chat_messages;

-- ==================== STATISTIQUES ====================

/**
 * Statistiques du tableau de bord, agrégées par la base.
 *
 * `p_organizer_id` à NULL renvoie les chiffres de toute la plateforme (admin).
 * Cette agrégation remplace le chargement intégral des tables côté application :
 * le coût ne dépend plus du nombre de commandes.
 */
create or replace function dashboard_stats(p_organizer_id uuid default null)
returns jsonb
language sql
stable
as $$
with scoped_competitions as (
  select * from competitions
  where p_organizer_id is null or organizer_id = p_organizer_id
),
scoped_orders as (
  select * from orders
  where p_organizer_id is null or organizer_id = p_organizer_id
),
paid_orders as (
  select * from scoped_orders where status = 'PAID'
),
totals as (
  select
    (select count(*) from scoped_competitions)                          as total_competitions,
    (select coalesce(sum(candidates_count), 0) from scoped_competitions) as total_candidates,
    (select coalesce(sum(total_votes), 0) from scoped_competitions)      as total_votes,
    (select coalesce(sum(paid_votes), 0) from scoped_competitions)       as paid_votes,
    (select coalesce(sum(free_votes), 0) from scoped_competitions)       as free_votes,
    (select coalesce(sum(amount), 0) from paid_orders)                   as total_revenue,
    (select count(*) from paid_orders where type = 'LIVE_ACCESS')        as live_access_sold
),
monthly as (
  -- Le mois est renvoyé au format ISO : la mise en forme en français est faite
  -- par l'application, pour ne pas dépendre de la locale du serveur.
  select
    to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
    date_trunc('month', created_at)                     as bucket,
    coalesce(sum(votes), 0)                             as votes,
    coalesce(sum(amount), 0)                            as revenue
  from paid_orders
  where created_at >= date_trunc('month', now()) - interval '11 months'
  group by 1, 2
  order by bucket
),
top_competitions as (
  select c.id, c.title, c.total_votes as votes,
         coalesce((select sum(o.amount) from paid_orders o where o.competition_id = c.id), 0) as revenue
  from scoped_competitions c
  order by revenue desc, votes desc
  limit 5
),
top_organizers as (
  select u.id, u.name,
         coalesce((select sum(c.total_votes) from competitions c where c.organizer_id = u.id), 0) as votes,
         coalesce((select sum(o.amount) from orders o
                    where o.organizer_id = u.id and o.status = 'PAID'), 0) as revenue
  from users u
  where u.role = 'organizer' and not u.deleted
  order by revenue desc
  limit 5
),
recent as (
  select * from scoped_orders order by created_at desc limit 10
)
select jsonb_build_object(
  'totalCompetitions', (select total_competitions from totals),
  'totalCandidates',   (select total_candidates from totals),
  'totalVotes',        (select total_votes from totals),
  'paidVotes',         (select paid_votes from totals),
  'freeVotes',         (select free_votes from totals),
  'totalRevenue',      (select total_revenue from totals),
  'liveAccessSold',    (select live_access_sold from totals),
  'totalOrganizers',   (select count(*) from users where role = 'organizer' and not deleted),
  'totalCustomers',    (select count(*) from users where role = 'customer' and not deleted),
  'votesByMonth',      coalesce((select jsonb_agg(jsonb_build_object(
                          'month', month, 'votes', votes, 'revenue', revenue)) from monthly), '[]'::jsonb),
  'topCompetitions',   coalesce((select jsonb_agg(jsonb_build_object(
                          'competitionId', id, 'title', title,
                          'votes', votes, 'revenue', revenue)) from top_competitions), '[]'::jsonb),
  'topOrganizers',     coalesce((select jsonb_agg(jsonb_build_object(
                          'organizerId', id, 'organizerName', name,
                          'votes', votes, 'revenue', revenue)) from top_organizers), '[]'::jsonb),
  'recentOrders',      coalesce((select jsonb_agg(to_jsonb(recent)) from recent), '[]'::jsonb)
);
$$;

/**
 * Reversements dus à chaque organisateur, commissions déduites.
 */
create or replace function organizer_payouts()
returns table (
  organizer_id       uuid,
  organizer_name     text,
  organizer_email    text,
  total_revenue      numeric,
  platform_commission numeric,
  transaction_fees   numeric,
  net_payout         numeric,
  orders_count       bigint,
  last_order_date    timestamptz
)
language sql
stable
as $$
  with settings as (
    select platform_fee_percentage as platform_fee,
           transaction_fee_percentage as transaction_fee
    from platform_settings where id = 'default'
  ),
  revenue as (
    select o.organizer_id,
           sum(o.amount)     as total,
           count(*)          as orders_count,
           max(o.created_at) as last_order
    from orders o
    where o.status = 'PAID'
    group by o.organizer_id
  )
  select
    u.id,
    u.name,
    u.email::text,
    coalesce(r.total, 0),
    coalesce(r.total, 0) * (select platform_fee from settings) / 100,
    coalesce(r.total, 0) * (select transaction_fee from settings) / 100,
    coalesce(r.total, 0)
      * (100 - (select platform_fee from settings) - (select transaction_fee from settings)) / 100,
    coalesce(r.orders_count, 0),
    r.last_order
  from users u
  left join revenue r on r.organizer_id = u.id
  where u.role = 'organizer' and not u.deleted
  order by coalesce(r.total, 0) desc;
$$;
