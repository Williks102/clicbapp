/*
 * Code d'accès au direct.
 *
 * L'accès acheté était rattaché au compte sans rien remettre à l'acheteur :
 * après paiement, il n'avait ni référence ni preuve d'achat à conserver.
 *
 * Le code est une **référence lisible**, pas un secret suffisant : il figure
 * sur la confirmation et dans l'e-mail, mais ne débloque rien à lui seul.
 * L'accès reste conditionné au compte — la contrainte
 * `live_access_is_granted_once` garantit qu'un achat vaut pour un compte, et
 * cette garantie ne doit pas tomber parce qu'un code a circulé.
 */

/**
 * Produit un code du type `LIVE-A3F1B-9C2D0`.
 *
 * `gen_random_bytes` plutôt que `random()` : ce code est affiché et échangé,
 * un générateur prévisible permettrait d'énumérer les achats d'autrui. La
 * représentation hexadécimale évite les caractères ambigus — ni O ni 0, ni I
 * ni 1 — pour rester dictable au téléphone.
 */
create or replace function generate_live_access_code()
returns text
language plpgsql as $$
declare
  v_hex  text;
  v_code text;
begin
  loop
    v_hex := upper(encode(gen_random_bytes(5), 'hex'));
    v_code := 'LIVE-' || substr(v_hex, 1, 5) || '-' || substr(v_hex, 6, 5);
    exit when not exists (select 1 from live_access where access_code = v_code);
  end loop;

  return v_code;
end;
$$;

alter table live_access add column if not exists access_code text;

-- Les accès déjà vendus reçoivent leur code : la colonne devient obligatoire
-- juste après, et une valeur manquante bloquerait la contrainte.
do $$
declare r record;
begin
  for r in select id from live_access where access_code is null loop
    update live_access set access_code = generate_live_access_code() where id = r.id;
  end loop;
end;
$$;

alter table live_access
  alter column access_code set default generate_live_access_code();
alter table live_access alter column access_code set not null;

alter table live_access drop constraint if exists live_access_code_is_unique;
alter table live_access add constraint live_access_code_is_unique unique (access_code);

grant execute on function generate_live_access_code() to service_role;
revoke execute on function generate_live_access_code() from public, anon;
