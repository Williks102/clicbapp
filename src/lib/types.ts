

export type TicketTier = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type Event = {
  id: string;
  name: string;
  category: string;
  date: string;
  location: string;
  description: string;
  image: string;
  organizerId: string;
  tickets: TicketTier[];
  livestream?: {
    enabled: boolean;
    title: string;
    ticketPrice: number;
  };
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

export type Sale = {
  id: string;
  ticketNumber?: string; // Numéro de billet unique (ex: TKT-ABC123)
  eventId: string;
  ticketId: string;
  customerName: string;
  customerEmail: string;
  quantity: number;
  totalPrice: number;
  purchaseDate: string;
  organizerId: string;
};

export type TicketScan = {
  id: string;
  saleId: string;
  ticketNumber: string; // Identifiant unique du billet scanné
  eventId: string;
  ticketId: string;
  scannedBy: string;
  scannedByName: string;
  scannedAt: string;
  holderName: string;
  quantity: number;
};

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
  disabled?: boolean;
  deleted?: boolean;
  deletedAt?: string;
}

// ==================== ACTION TYPES ====================

/**
 * Données requises pour créer un achat
 */
export type PurchaseData = {
  eventId: string;
  ticketId: string;
  quantity: number;
  fullName: string;
  email: string;
  totalPrice: number;
};

/**
 * Résultat d'une action d'achat
 */
export type PurchaseResult = {
  success: boolean;
  error?: string;
  saleId?: string;
  message?: string;
};

/**
 * Résultat générique d'une action serveur
 */
export type ActionResult = {
  success: boolean;
  error?: string;
  message?: string;
};

/**
 * Statistiques organisateur
 */
export type OrganizerStats = {
  totalSales: number;
  totalRevenue: number;
  totalTicketsSold: number;
  totalEvents: number;
  salesByMonth: Array<{ month: string; sales: number; revenue: number }>;
  topEvents: Array<{ eventId: string; eventName: string; sales: number; revenue: number }>;
  recentSales: Sale[];
};

/**
 * Statistiques admin
 */
export type AdminStats = {
  totalSales: number;
  totalRevenue: number;
  totalTicketsSold: number;
  totalEvents: number;
  totalOrganizers: number;
  totalCustomers: number;
  salesByMonth: Array<{ month: string; sales: number; revenue: number }>;
  topEvents: Array<{ eventId: string; eventName: string; sales: number; revenue: number }>;
  topOrganizers: Array<{ organizerId: string; organizerName: string; sales: number; revenue: number }>;
  recentSales: Sale[];
};

/**
 * Configuration de la file d'attente pour un événement
 */
export type QueueConfig = {
  enabled: boolean;
  maxConcurrentUsers: number; // Nombre max d'utilisateurs simultanés en checkout
  averageCheckoutTime: number; // Temps moyen de checkout en secondes
};

/**
 * Utilisateur dans la file d'attente
 */
export type QueueUser = {
  id: string;
  sessionId: string;
  eventId: string;
  ticketId: string;
  joinedAt: string;
  expiresAt?: string; // Quand l'utilisateur doit être retiré automatiquement
  status: 'waiting' | 'active' | 'completed' | 'expired';
};

/**
 * État de la file d'attente
 */
export type QueueState = {
  position: number;
  totalInQueue: number;
  estimatedWaitTime: number; // en secondes
  status: 'waiting' | 'active' | 'expired';
  joinedAt: Date;
};
