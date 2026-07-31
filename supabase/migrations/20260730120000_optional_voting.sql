/*
 * Diffuser un événement sans organiser de vote.
 *
 * Les champs `live_*` étaient déjà tous optionnels : rien n'exigeait une
 * diffusion. C'est l'inverse qui était câblé — la fenêtre de vote était
 * obligatoire, si bien qu'aucun événement ne pouvait exister sans scrutin.
 *
 * Le vote devient donc une composante facultative, au même titre que la
 * diffusion. Un événement doit porter au moins l'une des deux.
 */

alter table competitions
  add column if not exists voting_enabled boolean not null default true;

-- La fenêtre de vote n'a plus de sens sans vote.
alter table competitions alter column voting_starts_at drop not null;
alter table competitions alter column voting_ends_at   drop not null;

/*
 * `voting_window_is_ordered` reste valide en présence de NULL : une
 * comparaison avec NULL donne NULL, et une contrainte CHECK n'échoue que sur
 * `false`. Les deux règles ci-dessous complètent le contrôle.
 */

alter table competitions drop constraint if exists voting_needs_a_window;
alter table competitions add constraint voting_needs_a_window check (
  not voting_enabled
  or (voting_starts_at is not null and voting_ends_at is not null)
);

-- Un événement qui ne propose ni vote ni diffusion n'aurait aucun contenu.
alter table competitions drop constraint if exists event_offers_something;
alter table competitions add constraint event_offers_something check (
  voting_enabled or live_enabled
);

-- Le catalogue des concours filtre sur cette colonne, la page des diffusions non.
create index if not exists competitions_voting_enabled_idx
  on competitions (voting_enabled, status);

/**
 * Le vote est-il ouvert à cet instant ?
 *
 * Repris de la logique applicative pour que la base puisse la faire respecter
 * indépendamment de l'appelant : un événement sans vote ne peut en recevoir
 * aucun, quelle que soit la voie empruntée.
 */
create or replace function voting_is_open(p_competition_id uuid)
returns boolean
language sql stable as $$
  select c.voting_enabled
     and c.status = 'voting'
     and c.voting_starts_at <= now()
     and c.voting_ends_at   >= now()
    from competitions c
   where c.id = p_competition_id;
$$;

/**
 * Vote gratuit — refuse désormais les événements sans scrutin.
 *
 * Corps repris à l'identique de la migration initiale ; seul le contrôle
 * `VOTING_DISABLED` est ajouté. Le délai d'attente reste appliqué par la
 * clause WHERE de la mise à jour, si bien que deux requêtes simultanées ne
 * peuvent pas produire deux votes.
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

  -- Nouveau : un événement de diffusion pure ne reçoit aucun vote.
  if not v_competition.voting_enabled then
    raise exception 'VOTING_DISABLED' using errcode = 'P0001';
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

grant execute on function voting_is_open(uuid) to service_role;
revoke execute on function voting_is_open(uuid) from public, anon;
