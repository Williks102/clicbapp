/*
 * Ajoute le statut `EXPIRED` aux commandes.
 *
 * Migration isolée : PostgreSQL interdit d'utiliser une valeur d'énumération
 * dans la transaction qui la crée. La fonction qui s'en sert vit donc dans la
 * migration suivante.
 */
alter type order_status add value if not exists 'EXPIRED';
