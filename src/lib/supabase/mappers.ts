/**
 * Conversion des lignes PostgreSQL vers les types applicatifs.
 *
 * L'interface manipule des objets camelCase décrits dans `src/lib/types.ts`.
 * Concentrer la traduction ici permet de faire évoluer le schéma sans toucher
 * aux composants.
 */

import type {
  Candidate,
  ChatMessage,
  Competition,
  LiveAccess,
  Order,
  Organizer,
  User,
  Vote,
  VotePack,
} from '@/lib/types';
import type {
  CandidateRow,
  ChatMessageRow,
  CompetitionRow,
  LiveAccessRow,
  OrderRow,
  OrganizerRow,
  UserRow,
  VotePackRow,
  VoteRow,
} from '@/lib/supabase/types';

/** `numeric` PostgreSQL peut être renvoyé sous forme de chaîne. */
function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number.parseFloat(value) || 0;
}

export function toVotePack(row: VotePackRow): VotePack {
  return {
    id: row.id,
    name: row.name,
    votes: row.votes,
    price: num(row.price),
    highlighted: row.highlighted,
  };
}

export function toCompetition(row: CompetitionRow): Competition {
  const packs = (row.vote_packs ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(toVotePack);

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    coverImage: row.cover_image,
    organizerId: row.organizer_id,
    organizerName: row.organizer_name ?? '',
    status: row.status,
    votingEnabled: row.voting_enabled,
    votingStartsAt: row.voting_starts_at ?? undefined,
    votingEndsAt: row.voting_ends_at ?? undefined,
    hideResults: row.hide_results,
    winnerCandidateId: row.winner_candidate_id ?? undefined,
    votePacks: packs,
    freeVote: {
      enabled: row.free_vote_enabled,
      cooldownHours: row.free_vote_cooldown_hours,
    },
    live: {
      enabled: row.live_enabled,
      title: row.live_title,
      provider: row.live_provider,
      url: row.live_url ?? '',
      isLive: row.live_is_live,
      scheduledAt: row.live_scheduled_at ?? '',
      paid: row.live_paid,
      price: num(row.live_price),
      chatEnabled: row.live_chat_enabled,
      replayUrl: row.live_replay_url ?? '',
    },
    stats: {
      totalVotes: num(row.total_votes),
      freeVotes: num(row.free_votes),
      paidVotes: num(row.paid_votes),
      totalRevenue: num(row.total_revenue ?? 0),
      candidatesCount: row.candidates_count,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCandidate(row: CandidateRow): Candidate {
  return {
    id: row.id,
    competitionId: row.competition_id,
    name: row.name,
    number: row.number,
    photo: row.photo,
    bio: row.bio,
    city: row.city,
    voteCount: num(row.vote_count),
    freeVoteCount: num(row.free_vote_count),
    paidVoteCount: num(row.paid_vote_count),
    eliminated: row.eliminated,
    createdAt: row.created_at,
  };
}

export function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    type: row.type,
    competitionId: row.competition_id,
    competitionTitle: row.competition_title,
    organizerId: row.organizer_id,
    candidateId: row.candidate_id ?? undefined,
    candidateName: row.candidate_name ?? undefined,
    packId: row.pack_id ?? undefined,
    packName: row.pack_name ?? undefined,
    votes: row.votes ?? undefined,
    amount: num(row.amount),
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone ?? undefined,
    userId: row.user_id ?? undefined,
    status: row.status,
    paymentDetails: row.payment_details,
    createdAt: row.created_at,
    paidAt: row.paid_at ?? undefined,
  };
}

export function toVote(row: VoteRow): Vote {
  return {
    id: row.id,
    competitionId: row.competition_id,
    candidateId: row.candidate_id,
    candidateName: row.candidate_name,
    userId: row.user_id ?? undefined,
    voterEmail: row.voter_email ?? undefined,
    voterName: row.voter_name ?? undefined,
    quantity: row.quantity,
    type: row.type,
    orderId: row.order_id ?? undefined,
    createdAt: row.created_at,
  };
}

export function toLiveAccess(row: LiveAccessRow): LiveAccess {
  return {
    id: row.id,
    userId: row.user_id,
    competitionId: row.competition_id,
    orderId: row.order_id ?? undefined,
    pricePaid: num(row.price_paid),
    purchaseDate: row.purchase_date,
    accessCode: row.access_code,
  };
}

export function toChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    competitionId: row.competition_id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    message: row.message,
    hidden: row.hidden,
    createdAt: row.created_at,
  };
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar ?? undefined,
    bio: row.bio ?? undefined,
    createdAt: row.created_at,
    notificationPreferences: row.notification_preferences ?? undefined,
    chatBanned: row.chat_banned,
    disabled: row.disabled,
    deleted: row.deleted,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export function toOrganizer(row: OrganizerRow): Organizer {
  return {
    id: row.id,
    name: row.name,
    bio: row.bio,
    avatar: row.avatar,
  };
}
