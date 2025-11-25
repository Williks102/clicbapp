
import type { Event, Organizer, Category, Sale, User } from './types';

export const organizers: Organizer[] = [
  {
    id: 'org-1',
    name: 'Live Nation Ivoire',
    bio: 'Bringing the biggest international and local artists to Côte d\'Ivoire. We specialize in large-scale concerts and festivals.',
    avatar: 'organizer-1',
  },
  {
    id: 'org-2',
    name: 'Tech-Hub Abidjan',
    bio: 'Fostering innovation and collaboration in the Ivorian tech scene through conferences, workshops, and networking events.',
    avatar: 'organizer-2',
  },
  {
    id: 'org-lagopauline',
    name: 'Pauline Lago Events',
    bio: 'Créatrice d\'événements culturels et artistiques uniques à Abidjan.',
    avatar: 'organizer-2',
  }
];

export const events: Event[] = [
  {
    id: 'evt-1',
    name: 'Festival des Musiques Urbaines d\'Anoumabo (FEMUA)',
    category: 'Music',
    date: '2024-11-15T19:00:00Z',
    location: 'Abidjan, Anoumabo',
    description: 'Le FEMUA est un festival de musique engagé qui réunit des artistes de renommée internationale et des talents locaux pour des concerts exceptionnels. Plus qu\'un simple événement musical, le FEMUA est une plateforme pour le développement social et culturel.',
    image: 'event-1',
    organizerId: 'org-1',
    tickets: [
      { id: 'tkt-1', name: 'Standard', price: 25000, quantity: 2000 },
      { id: 'tkt-2', name: 'VIP', price: 75000, quantity: 500 },
    ],
  },
  {
    id: 'evt-2',
    name: 'Exposition "Abidjan, Toile d\'Artistes"',
    category: 'Art & Culture',
    date: '2024-10-25T10:00:00Z',
    location: 'Musée des Civilisations, Abidjan',
    description: 'Découvrez la scène artistique contemporaine ivoirienne à travers une exposition collective présentant les œuvres de plus de 30 artistes. Une immersion dans la créativité et la diversité culturelle de la Côte d\'Ivoire.',
    image: 'event-2',
    organizerId: 'org-lagopauline',
    tickets: [
      { id: 'tkt-3', name: 'Entrée Générale', price: 5000, quantity: 1000 },
    ],
  },
  {
    id: 'evt-3',
    name: 'Abidjan Restaurant Week',
    category: 'Food & Drink',
    date: '2024-09-20T12:00:00Z',
    location: 'Divers restaurants, Abidjan',
    description: 'Célébrez la gastronomie ivoirienne ! Pendant une semaine, les meilleurs restaurants d\'Abidjan proposent des menus spéciaux à des prix attractifs. Une occasion unique de savourer des plats exceptionnels.',
    image: 'event-3',
    organizerId: 'org-2',
    tickets: [
      { id: 'tkt-4', name: 'Pass Découverte', price: 15000, quantity: 1500 },
    ],
  },
  {
    id: 'evt-4',
    name: 'Africa Web Festival',
    category: 'Conference',
    date: '2024-11-28T09:00:00Z',
    location: 'Sofitel Abidjan Hôtel Ivoire',
    description: 'Le rendez-vous incontournable des acteurs du numérique en Afrique. Conférences, ateliers et networking pour explorer les dernières tendances de la tech et de l\'innovation sur le continent.',
    image: 'event-4',
    organizerId: 'org-2',
    tickets: [
      { id: 'tkt-5', name: 'Pass 1 Jour', price: 50000, quantity: 500 },
      { id: 'tkt-6', name: 'Pass Complet', price: 120000, quantity: 300 },
    ],
  },
];

export const sales: Sale[] = [
    {
        id: 'sale-1',
        eventId: 'evt-1',
        ticketId: 'tkt-1',
        customerName: 'Aisha Koné',
        customerEmail: 'aisha.kone@example.com',
        quantity: 2,
        totalPrice: 50000,
        purchaseDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
        organizerId: 'org-1',
    },
    {
        id: 'sale-2',
        eventId: 'evt-1',
        ticketId: 'tkt-2',
        customerName: 'Moussa Diarra',
        customerEmail: 'moussa.diarra@example.com',
        quantity: 1,
        totalPrice: 75000,
        purchaseDate: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
        organizerId: 'org-1',
    },
    {
        id: 'sale-3',
        eventId: 'evt-4',
        ticketId: 'tkt-5',
        customerName: 'Fatou Camara',
        customerEmail: 'fatou.camara@example.com',
        quantity: 1,
        totalPrice: 50000,
        purchaseDate: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
        organizerId: 'org-2',
    },
     {
        id: 'sale-4',
        eventId: 'evt-4',
        ticketId: 'tkt-6',
        customerName: 'Ousmane Traoré',
        customerEmail: 'ousmane.traore@example.com',
        quantity: 2,
        totalPrice: 240000,
        purchaseDate: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
        organizerId: 'org-2',
    },
     {
        id: 'sale-5',
        eventId: 'evt-1',
        ticketId: 'tkt-1',
        customerName: 'Aminata Sow',
        customerEmail: 'aminata.sow@example.com',
        quantity: 4,
        totalPrice: 100000,
        purchaseDate: new Date().toISOString(),
        organizerId: 'org-1',
    }
];

export const categories: Category[] = [
    { id: 'cat-1', name: 'Music' },
    { id: 'cat-2', name: 'Art & Culture' },
    { id: 'cat-3', name: 'Food & Drink' },
    { id: 'cat-4', name: 'Conference' },
    { id: 'cat-5', name: 'Sports' },
    { id: 'cat-6', name: 'Community' },
];

export const users: User[] = [
  {
    id: 'usr-1',
    name: 'Aisha Koné',
    email: 'aisha.kone@example.com',
    role: 'customer',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'org-1',
    name: 'Live Nation Ivoire',
    email: 'contact@livenation.com',
    role: 'organizer',
    avatar: 'organizer-1',
    bio: 'Bringing the biggest international and local artists to Côte d\'Ivoire. We specialize in large-scale concerts and festivals.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'org-2',
    name: 'Tech-Hub Abidjan',
    email: 'contact@tech-hub.com',
    role: 'organizer',
    avatar: 'organizer-2',
    bio: 'Fostering innovation and collaboration in the Ivorian tech scene through conferences, workshops, and networking events.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'admin-koffiw4', // This ID will be replaced by the real UID from Auth
    name: 'Admin Koffi',
    email: 'koffiw4@gmail.com',
    role: 'admin',
    avatar: 'organizer-2',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'org-lagopauline', // This ID matches the organizer entry
    name: 'Pauline Lago',
    email: 'lagopauline28@gmail.com',
    role: 'organizer',
    avatar: 'organizer-2',
    bio: 'Créatrice d\'événements culturels et artistiques uniques à Abidjan.',
    createdAt: new Date().toISOString(),
  }
];
