/*
 * Ajoute TikTok aux plateformes de diffusion.
 *
 * Migration isolée : PostgreSQL interdit d'utiliser une valeur d'énumération
 * dans la transaction qui la crée.
 */
alter type live_provider add value if not exists 'tiktok';
