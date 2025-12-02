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