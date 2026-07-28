import type { Category, Organizer, User } from './types';

/**
 * Jeux de données de démonstration, utilisés pour amorcer un environnement de
 * développement vide. Les données réelles vivent dans Firestore.
 */

export const organizers: Organizer[] = [
  {
    id: 'org-1',
    name: 'Ivoire Productions',
    bio: "Producteur d'émissions et de concours télévisés en Côte d'Ivoire.",
    avatar: 'organizer-1',
  },
  {
    id: 'org-2',
    name: 'Abidjan Talents',
    bio: 'Organisateur de télé-crochets et de compétitions de jeunes talents.',
    avatar: 'organizer-2',
  },
];

export const categories: Category[] = [
  { id: 'cat-1', name: 'Beauté & Miss' },
  { id: 'cat-2', name: 'Musique & Télé-crochet' },
  { id: 'cat-3', name: 'Danse' },
  { id: 'cat-4', name: 'Awards' },
  { id: 'cat-5', name: 'Sport' },
  { id: 'cat-6', name: 'Mode' },
  { id: 'cat-7', name: 'Humour' },
  { id: 'cat-8', name: 'Talents & Innovation' },
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
    name: 'Ivoire Productions',
    email: 'contact@ivoireproductions.ci',
    role: 'organizer',
    avatar: 'organizer-1',
    bio: "Producteur d'émissions et de concours télévisés en Côte d'Ivoire.",
    createdAt: new Date().toISOString(),
  },
  {
    id: 'org-2',
    name: 'Abidjan Talents',
    email: 'contact@abidjantalents.ci',
    role: 'organizer',
    avatar: 'organizer-2',
    bio: 'Organisateur de télé-crochets et de compétitions de jeunes talents.',
    createdAt: new Date().toISOString(),
  },
];
