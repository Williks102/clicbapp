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
  disabled?: boolean;      // ✅ AJOUTÉ - Pour activer/désactiver le compte
  deleted?: boolean;       // ✅ AJOUTÉ - Pour soft delete
  deletedAt?: string;      // ✅ AJOUTÉ - Date de suppression
}