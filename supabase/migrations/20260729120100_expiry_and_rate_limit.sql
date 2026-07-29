/*
 * Expiration des commandes et limitation de débit de l'authentification.
 */

-- ============================================================
-- 1. Expiration des commandes en attente
-- ============================================================

/**
 * Ferme les commandes restées en attente au-delà du délai donné.
 *
 * Une commande `PENDING` correspond à un tunnel de paiement ouvert puis
 * abandonné : sans expiration, elles s'accumulent indéfiniment et brouillent
 * le suivi des ventes. Aucun vote n'ayant été crédité, la fermeture est sans
 * effet comptable.
 *
 * `EXPIRED` reste réversible : `confirm_order_payment` accepte de créditer une
 * commande expirée. Un règlement confirmé tardivement par Paystack — webhook
 * rejoué, incident réseau chez l'opérateur — n'est donc jamais perdu.
 */
create or replace function expire_stale_orders(p_hours int default 24)
returns int
language plpgsql as $$
declare
  v_expired int;
begin
  update orders
     set status = 'EXPIRED'
   where status = 'PENDING'
     and created_at <= now() - make_interval(hours => p_hours);

  get diagnostics v_expired = row_count;
  return v_expired;
end;
$$;

/**
 * Confirme le règlement d'une commande.
 *
 * Modification : une commande `EXPIRED` redevient créditable. La clôture pour
 * cause d'abandon ne doit jamais faire perdre un paiement que Paystack finit
 * par confirmer.
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

  -- `EXPIRED` est réversible ; `PAID`, `FAILED`, `FLAGGED` et `REFUNDED` sont
  -- des états définitifs qu'un rejeu ne doit pas rouvrir.
  if v_order.status not in ('PENDING', 'EXPIRED') then
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

-- Sert le balayage périodique, qui filtre sur ces deux colonnes.
create index if not exists orders_pending_created_at_idx
  on orders (created_at)
  where status = 'PENDING';

-- ============================================================
-- 2. Limitation de débit de l'authentification
-- ============================================================

/**
 * Compteurs de tentatives, par fenêtre glissante.
 *
 * L'état vit en base et non en mémoire : les instances serverless ne partagent
 * rien et sont recyclées en permanence, si bien qu'un compteur en mémoire se
 * réinitialise à chaque démarrage à froid — précisément ce qu'un attaquant
 * provoque en répartissant ses essais.
 */
create table if not exists auth_throttle (
  key          text primary key,
  window_start timestamptz not null default now(),
  attempts     int         not null default 0
);

create index if not exists auth_throttle_window_start_idx on auth_throttle (window_start);

alter table auth_throttle enable row level security;

/**
 * Enregistre une tentative et indique si elle est autorisée.
 *
 * L'incrément et la lecture se font dans une seule instruction : deux essais
 * simultanés ne peuvent pas passer tous les deux au travers du seuil.
 *
 * Renvoie `allowed`, le nombre de tentatives dans la fenêtre courante, et le
 * délai restant avant réouverture.
 */
create or replace function check_auth_rate_limit(
  p_key            text,
  p_max            int,
  p_window_seconds int
) returns jsonb
language plpgsql as $$
declare
  v_row    auth_throttle%rowtype;
  v_window interval := make_interval(secs => p_window_seconds);
begin
  insert into auth_throttle (key, window_start, attempts)
  values (p_key, now(), 1)
  on conflict (key) do update
     set attempts = case
           when auth_throttle.window_start <= now() - v_window then 1
           else auth_throttle.attempts + 1
         end,
         window_start = case
           when auth_throttle.window_start <= now() - v_window then now()
           else auth_throttle.window_start
         end
  returning * into v_row;

  return jsonb_build_object(
    'allowed',     v_row.attempts <= p_max,
    'attempts',    v_row.attempts,
    'retry_after', greatest(
      0,
      ceil(extract(epoch from (v_row.window_start + v_window - now())))
    )::int
  );
end;
$$;

/**
 * Efface le compteur d'une clé.
 *
 * Appelée après une authentification réussie : une suite d'échecs suivie d'une
 * réussite ne doit pas pénaliser l'utilisateur légitime qui s'est simplement
 * trompé de mot de passe.
 */
create or replace function reset_auth_rate_limit(p_key text)
returns void
language plpgsql as $$
begin
  delete from auth_throttle where key = p_key;
end;
$$;

/** Purge les compteurs dont la fenêtre est close depuis longtemps. */
create or replace function purge_auth_throttle(p_hours int default 24)
returns int
language plpgsql as $$
declare
  v_deleted int;
begin
  delete from auth_throttle where window_start <= now() - make_interval(hours => p_hours);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- ============================================================
-- 3. Privilèges
-- ============================================================

grant select, insert, update, delete on auth_throttle to service_role;

grant execute on function
  expire_stale_orders(int),
  check_auth_rate_limit(text, int, int),
  reset_auth_rate_limit(text),
  purge_auth_throttle(int)
to service_role;

-- Ces fonctions modifient l'état : le navigateur ne doit jamais pouvoir les
-- appeler, ni pour s'octroyer un crédit ni pour effacer son propre compteur.
revoke execute on function
  expire_stale_orders(int),
  check_auth_rate_limit(text, int, int),
  reset_auth_rate_limit(text),
  purge_auth_throttle(int)
from public, anon;
