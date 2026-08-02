/*
 * Restreint ce que la clé `anon` peut réellement lire.
 *
 * La politique RLS était correcte au niveau des lignes, mais RLS ne filtre pas
 * les colonnes : toute ligne visible l'était en entier. Deux conséquences
 * exploitables sans aucune authentification, avec la seule clé publique
 * présente dans le code du site.
 */

-- ============================================================
-- 1. L'URL du flux ne doit jamais atteindre le navigateur
-- ============================================================

/*
 * `live_url` et `live_replay_url` étaient lisibles pour tout concours non
 * brouillon, y compris les diffusions payantes : il suffisait d'interroger
 * l'API REST avec la clé `anon` pour obtenir l'adresse du flux et regarder
 * sans payer. Le paywall applicatif ne protégeait rien.
 *
 * `total_revenue` part avec elles : le chiffre d'affaires d'un organisateur
 * n'a pas à être public.
 *
 * PostgreSQL sait restreindre les privilèges colonne par colonne ; c'est le
 * seul niveau où cette règle peut être imposée.
 */
revoke select on competitions from anon;

grant select (
  id, organizer_id, organizer_name, title, category, description, cover_image,
  status, voting_enabled, voting_starts_at, voting_ends_at, hide_results,
  winner_candidate_id,
  free_vote_enabled, free_vote_cooldown_hours,
  live_enabled, live_title, live_provider, live_is_live, live_scheduled_at,
  live_paid, live_price, live_chat_enabled,
  total_votes, free_votes, paid_votes, candidates_count,
  created_at, updated_at
) on competitions to anon;

-- ============================================================
-- 2. Un message masqué doit disparaître pour de bon
-- ============================================================

/*
 * La modération n'était appliquée que par le composant d'affichage : les
 * messages masqués continuaient d'être servis à la clé `anon`, et restaient
 * lisibles en interrogeant l'API directement. Masquer une insulte ne la
 * retirait donc de la vue que des utilisateurs bien intentionnés.
 */
drop policy if exists chat_of_published_competitions_is_public on chat_messages;

create policy visible_chat_of_published_competitions_is_public on chat_messages
  for select to anon using (
    not hidden
    and exists (
      select 1 from competitions c
       where c.id = competition_id and c.status <> 'draft'
    )
  );
