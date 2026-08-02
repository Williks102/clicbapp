/**
 * Représentation des lignes PostgreSQL telles que renvoyées par Supabase.
 *
 * Ces types décrivent le schéma (snake_case) ; les types applicatifs de
 * `src/lib/types.ts` restent en camelCase. La conversion est centralisée dans
 * `src/lib/supabase/mappers.ts`, ce qui isole entièrement l'interface du
 * schéma de la base.
 */

export type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'customer' | 'organizer' | 'admin';
  avatar: string | null;
  bio: string | null;
  notification_preferences: {
    emailNotifications: boolean;
    platformUpdates: boolean;
  } | null;
  chat_banned: boolean;
  disabled: boolean;
  deleted: boolean;
  deleted_at: string | null;
  created_at: string;
};

export type OrganizerRow = {
  id: string;
  name: string;
  bio: string;
  avatar: string;
};

export type CategoryRow = {
  id: string;
  name: string;
};

export type VotePackRow = {
  id: string;
  competition_id: string;
  name: string;
  votes: number;
  price: number;
  highlighted: boolean;
  position: number;
};

export type CompetitionRow = {
  id: string;
  organizer_id: string;
  organizer_name: string | null;
  title: string;
  category: string;
  description: string;
  cover_image: string;
  status: 'draft' | 'published' | 'voting' | 'closed' | 'finished';
  voting_enabled: boolean;
  voting_starts_at: string | null;
  voting_ends_at: string | null;
  hide_results: boolean;
  winner_candidate_id: string | null;

  free_vote_enabled: boolean;
  free_vote_cooldown_hours: number;

  live_enabled: boolean;
  live_title: string;
  live_provider: 'youtube' | 'facebook' | 'vimeo' | 'tiktok' | 'hls' | 'iframe';
  /** Absent des lectures navigateur : non accordé à `anon`. */
  live_url: string;
  live_is_live: boolean;
  live_scheduled_at: string | null;
  live_paid: boolean;
  live_price: number;
  live_chat_enabled: boolean;
  live_replay_url: string;

  total_votes: number;
  free_votes: number;
  paid_votes: number;
  total_revenue: number;
  candidates_count: number;

  created_at: string;
  updated_at: string;

  /** Présent lorsque la requête fait la jointure sur les packs. */
  vote_packs?: VotePackRow[];
};

export type CandidateRow = {
  id: string;
  competition_id: string;
  name: string;
  number: number;
  photo: string;
  bio: string;
  city: string;
  vote_count: number;
  free_vote_count: number;
  paid_vote_count: number;
  eliminated: boolean;
  created_at: string;
};

export type OrderRow = {
  id: string;
  type: 'VOTE_PACK' | 'LIVE_ACCESS';
  competition_id: string;
  competition_title: string;
  organizer_id: string;
  candidate_id: string | null;
  candidate_name: string | null;
  pack_id: string | null;
  pack_name: string | null;
  votes: number | null;
  amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  user_id: string | null;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'FLAGGED' | 'REFUNDED' | 'EXPIRED';
  payment_details: unknown;
  refund_reason: string | null;
  refunded_at: string | null;
  refunded_by: string | null;
  created_at: string;
  paid_at: string | null;
};

export type VoteRow = {
  id: string;
  competition_id: string;
  candidate_id: string;
  candidate_name: string;
  user_id: string | null;
  voter_email: string | null;
  voter_name: string | null;
  quantity: number;
  type: 'free' | 'paid';
  order_id: string | null;
  created_at: string;
};

export type LiveAccessRow = {
  id: string;
  user_id: string;
  competition_id: string;
  order_id: string | null;
  price_paid: number;
  purchase_date: string;
  access_code: string;
};

export type ChatMessageRow = {
  id: string;
  competition_id: string;
  user_id: string;
  user_name: string;
  user_role: 'customer' | 'organizer' | 'admin';
  message: string;
  hidden: boolean;
  created_at: string;
};

export type PlatformSettingsRow = {
  id: string;
  platform_fee_percentage: number;
  transaction_fee_percentage: number;
  updated_at: string;
  updated_by: string | null;
};

/** Colonnes du concours, packs joints inclus. */
/**
 * Colonnes lues **côté serveur**, avec la clé `service_role`.
 * Inclut l'URL du flux et le chiffre d'affaires : ces données ne quittent
 * jamais le serveur.
 */
export const COMPETITION_COLUMNS = '*, vote_packs(*)';

/**
 * Colonnes lues **par le navigateur**, avec la clé `anon`.
 *
 * `live_url`, `live_replay_url` et `total_revenue` en sont absents : demander
 * `*` livrait l'adresse du flux payant à quiconque ouvrait la page, rendant le
 * paywall décoratif. La liste doit rester alignée sur les privilèges de
 * colonne accordés à `anon` (voir `supabase/migrations/…_restrict_anon_reads`) :
 * réclamer une colonne non accordée fait échouer toute la requête.
 */
export const PUBLIC_COMPETITION_COLUMNS = [
  'id',
  'organizer_id',
  'organizer_name',
  'title',
  'category',
  'description',
  'cover_image',
  'status',
  'voting_enabled',
  'voting_starts_at',
  'voting_ends_at',
  'hide_results',
  'winner_candidate_id',
  'free_vote_enabled',
  'free_vote_cooldown_hours',
  'live_enabled',
  'live_title',
  'live_provider',
  'live_is_live',
  'live_scheduled_at',
  'live_paid',
  'live_price',
  'live_chat_enabled',
  'total_votes',
  'free_votes',
  'paid_votes',
  'candidates_count',
  'created_at',
  'updated_at',
].join(', ') + ', vote_packs(*)';
