/*
 * Bannissement du chat, par diffusion.
 *
 * `users.chat_banned` est une colonne globale : un organisateur qui modérait
 * son propre direct réduisait au silence l'utilisateur sur **toute la
 * plateforme**, y compris chez les autres organisateurs. Et seul un
 * administrateur pouvait annuler — un modérateur pouvait donc infliger un état
 * qu'il ne savait pas défaire.
 *
 * Le bannissement devient donc local à la diffusion. `users.chat_banned` est
 * conservée, mais réservée à l'administration : c'est la sanction de dernier
 * recours à l'échelle du site.
 */
create table if not exists chat_bans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  competition_id uuid not null references competitions(id) on delete cascade,
  banned_by      uuid references users(id) on delete set null,
  created_at     timestamptz not null default now(),

  constraint chat_ban_is_unique_per_competition unique (user_id, competition_id)
);

create index if not exists chat_bans_competition_idx on chat_bans (competition_id);

alter table chat_bans enable row level security;

-- Aucune politique pour `anon` : la liste des personnes bannies n'a pas à être
-- publique. Les lectures passent par le serveur.
grant select, insert, delete on chat_bans to service_role;

/*
 * Reprise des bannissements existants.
 *
 * Ils étaient globaux sans qu'on sache qui les avait prononcés ni sur quel
 * direct. Les convertir en bannissements locaux exigerait une information
 * absente ; ils restent donc globaux, et l'administration pourra les lever au
 * cas par cas. Aucune donnée n'est perdue.
 */
