/*
 * Cycle de vie d'un événement de diffusion.
 *
 * Les statuts `voting` et `closed` décrivent l'état d'un scrutin. Ils n'ont
 * aucun sens pour une retransmission : un événement sans vote passe de
 * `draft` à `published`, puis `finished` une fois l'antenne rendue.
 */

/*
 * Reprise des données antérieures.
 *
 * Le vote n'est devenu facultatif que dans la migration précédente : des
 * événements ont pu être enregistrés sans scrutin tout en portant un statut
 * de vote. La contrainte ci-dessous les rejetterait, et une migration qui
 * échoue sur l'existant ne s'applique jamais.
 *
 * La correspondance est celle déjà retenue à l'affichage
 * (`LIVE_EVENT_STATUS_LABELS`) : un scrutin ouvert devient un événement
 * annoncé, un scrutin clos un événement terminé.
 */
update competitions
   set status = case status
                  when 'voting' then 'published'::competition_status
                  when 'closed' then 'finished'::competition_status
                  else status
                end
 where not voting_enabled
   and status in ('voting', 'closed');

-- L'interface ne propose déjà que brouillon, annoncé et terminé en mode
-- diffusion ; la contrainte les impose quelle que soit la voie d'appel.
alter table competitions drop constraint if exists live_event_status_is_valid;
alter table competitions add constraint live_event_status_is_valid check (
  voting_enabled or status not in ('voting', 'closed')
);
