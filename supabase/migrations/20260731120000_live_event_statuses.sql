/*
 * Cycle de vie d'un événement de diffusion.
 *
 * Les statuts `voting` et `closed` décrivent l'état d'un scrutin. Ils n'ont
 * aucun sens pour une retransmission : un événement sans vote passe de
 * `draft` à `published`, puis `finished` une fois l'antenne rendue.
 *
 * L'interface ne propose déjà que ces trois statuts en mode diffusion ; la
 * contrainte les impose quelle que soit la voie d'appel.
 */
alter table competitions drop constraint if exists live_event_status_is_valid;
alter table competitions add constraint live_event_status_is_valid check (
  voting_enabled or status not in ('voting', 'closed')
);
