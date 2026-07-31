// ============================================================
// ClicVote — Plateforme de vote & diffusion d'événements live
// ============================================================

// ==================== COMPÉTITIONS ====================

/**
 * Pack de votes achetable par le public.
 */
export type VotePack = {
  id: string;
  name: string;
  votes: number;
  price: number; // en F CFA
  highlighted?: boolean; // pack mis en avant ("le plus populaire")
};

/**
 * Configuration du vote gratuit (modèle hybride).
 */
export type FreeVoteConfig = {
  enabled: boolean;
  cooldownHours: number; // délai avant de pouvoir revoter gratuitement
};

export type LiveProvider =
  | 'youtube'
  | 'facebook'
  | 'vimeo'
  | 'tiktok'
  | 'hls'
  | 'iframe';

/**
 * Configuration de la diffusion en direct d'un concours.
 */
export type LiveConfig = {
  enabled: boolean;
  title: string;
  provider: LiveProvider;
  url: string; // URL de la vidéo (watch YouTube, m3u8, embed…)
  isLive: boolean;
  scheduledAt?: string; // ISO — date annoncée du direct
  /** Le direct est payant (paywall) ou libre d'accès. */
  paid: boolean;
  price: number; // en F CFA, 0 si gratuit
  chatEnabled: boolean;
  replayUrl?: string;
};

export type CompetitionStatus =
  | 'draft' // brouillon, invisible du public
  | 'published' // visible, vote pas encore ouvert
  | 'voting' // vote ouvert
  | 'closed' // vote fermé, résultats à venir
  | 'finished'; // terminé, résultats publiés

export type Competition = {
  id: string;
  title: string;
  category: string;
  description: string;
  coverImage: string;
  organizerId: string;
  organizerName?: string;
  status: CompetitionStatus;
  /**
   * Un événement peut se limiter à une diffusion. Quand le vote est désactivé,
   * la fenêtre de scrutin est absente et aucun candidat n'est attendu.
   */
  votingEnabled: boolean;
  /** Ouverture des votes (ISO). Absente si le vote est désactivé. */
  votingStartsAt?: string;
  /** Fermeture des votes (ISO). Absente si le vote est désactivé. */
  votingEndsAt?: string;
  votePacks: VotePack[];
  freeVote: FreeVoteConfig;
  live: LiveConfig;
  /** Compteurs dénormalisés pour l'affichage temps réel. */
  stats: CompetitionStats;
  /** Le classement est masqué au public jusqu'à la fin du vote. */
  hideResults?: boolean;
  winnerCandidateId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CompetitionStats = {
  totalVotes: number;
  freeVotes: number;
  paidVotes: number;
  totalRevenue: number;
  candidatesCount: number;
};

// ==================== CANDIDATS ====================

export type Candidate = {
  id: string;
  competitionId: string;
  name: string;
  /** Numéro de dossard affiché au public. */
  number: number;
  photo: string;
  bio: string;
  city?: string;
  voteCount: number;
  freeVoteCount: number;
  paidVoteCount: number;
  eliminated: boolean;
  createdAt: string;
};

// ==================== VOTES ====================

export type VoteType = 'free' | 'paid';

export type Vote = {
  id: string;
  competitionId: string;
  candidateId: string;
  candidateName: string;
  userId?: string;
  voterEmail?: string;
  voterName?: string;
  quantity: number;
  type: VoteType;
  orderId?: string; // pour les votes payants
  createdAt: string;
};

/**
 * Suivi du dernier vote gratuit d'un utilisateur sur un concours.
 * Document id = `${userId}_${competitionId}`.
 */
export type FreeVoteClaim = {
  id: string;
  userId: string;
  competitionId: string;
  lastVotedAt: string;
  totalFreeVotes: number;
};

// ==================== COMMANDES / PAIEMENTS ====================

export type OrderType = 'VOTE_PACK' | 'LIVE_ACCESS';

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'FLAGGED' | 'REFUNDED' | 'EXPIRED';

export type Order = {
  id: string; // référence de paiement (= id du document)
  type: OrderType;
  competitionId: string;
  competitionTitle: string;
  organizerId: string;
  /** Uniquement pour les commandes de type VOTE_PACK. */
  candidateId?: string;
  candidateName?: string;
  packId?: string;
  packName?: string;
  votes?: number;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  userId?: string;
  status: OrderStatus;
  paymentDetails?: any;
  createdAt: string;
  paidAt?: string;
};

/**
 * Accès payé à une diffusion en direct.
 */
export type LiveAccess = {
  id: string;
  userId: string;
  competitionId: string;
  orderId?: string;
  pricePaid: number;
  purchaseDate: string;
  /**
   * Référence lisible de l'achat, communiquée à l'acheteur. Elle ne débloque
   * rien à elle seule : l'accès reste rattaché au compte.
   */
  accessCode: string;
};

// ==================== CHAT LIVE ====================

export type ChatMessage = {
  id: string;
  competitionId: string;
  userId: string;
  userName: string;
  userRole: 'customer' | 'organizer' | 'admin';
  message: string;
  hidden: boolean;
  createdAt: string;
};

// ==================== UTILISATEURS ====================

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'organizer' | 'customer' | 'admin';
  avatar?: string;
  bio?: string;
  createdAt: string;
  notificationPreferences?: {
    emailNotifications: boolean;
    platformUpdates: boolean;
  };
  /** Empêche l'utilisateur d'écrire dans les chats live. */
  chatBanned?: boolean;
  disabled?: boolean;
  deleted?: boolean;
  deletedAt?: string;
};

export type Organizer = {
  id: string;
  name: string;
  bio: string;
  avatar: string;
};

export type Category = {
  id: string;
  name: string;
};

// ==================== RÉSULTATS D'ACTIONS ====================

export type ActionResult = {
  success: boolean;
  error?: string;
  message?: string;
};

export type VoteResult = ActionResult & {
  newVoteCount?: number;
  nextFreeVoteAt?: string;
};

export type PaymentInitResult = {
  success: boolean;
  error?: string;
  reference?: string;
  amount?: number;
  /** URL de paiement hébergée par Paystack, vers laquelle rediriger le client. */
  authorizationUrl?: string;
};

// ==================== STATISTIQUES ====================

export type OrganizerStats = {
  totalCompetitions: number;
  totalCandidates: number;
  totalVotes: number;
  paidVotes: number;
  freeVotes: number;
  totalRevenue: number;
  liveAccessSold: number;
  votesByMonth: Array<{ month: string; votes: number; revenue: number }>;
  topCompetitions: Array<{
    competitionId: string;
    title: string;
    votes: number;
    revenue: number;
  }>;
  recentOrders: Order[];
};

export type AdminStats = OrganizerStats & {
  totalOrganizers: number;
  totalCustomers: number;
  topOrganizers: Array<{
    organizerId: string;
    organizerName: string;
    votes: number;
    revenue: number;
  }>;
};

/** Ligne de classement affichée au public. */
export type LeaderboardEntry = {
  candidateId: string;
  name: string;
  photo: string;
  number: number;
  voteCount: number;
  percentage: number;
  rank: number;
};
