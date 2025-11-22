
'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { initializeFirebase } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { Event, TicketTier } from '@/lib/types';
import type { EventFormValues } from '@/app/dashboard/events/create/page';

const ticketSchema = z.object({
  name: z.string().min(1, 'Le nom du billet est requis.'),
  price: z.coerce.number().min(0, 'Le prix doit être positif.'),
  quantity: z.coerce.number().int().min(1, 'La quantité doit être au moins 1.'),
});

const formSchema = z.object({
  eventName: z.string().min(3, 'Le nom de l\'événement est requis.'),
  eventCategory: z.string().min(1, 'La catégorie est requise.'),
  eventDate: z.string().min(1, 'La date est requise.'),
  eventLocation: z.string().min(1, 'Le lieu est requis.'),
  eventDescription: z.string().min(10, 'La description est trop courte.'),
  eventDescriptionKeywords: z
    .string()
    .optional(),
  tickets: z.array(ticketSchema).min(1, 'Au moins un type de billet est requis.'),
});


export async function createEvent(data: EventFormValues) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Vous devez être connecté pour créer un événement.');
  }

  const validatedData = formSchema.safeParse(data);
  if (!validatedData.success) {
    const errorMessages = validatedData.error.errors.map(e => e.message).join(', ');
    throw new Error(`Données du formulaire invalides: ${errorMessages}`);
  }

  const {
    eventName,
    eventCategory,
    eventDate,
    eventLocation,
    eventDescription,
    tickets,
  } = validatedData.data;

  // Correction: S'assurer que Firebase est initialisé correctement côté serveur
  const { firestore } = initializeFirebase();

  const ticketsWithIds: TicketTier[] = tickets.map((t, index) => ({
    ...t,
    id: `tkt-${Date.now()}-${index}`,
  }));

  const newEvent: Omit<Event, 'id'> = {
    name: eventName,
    category: eventCategory,
    date: new Date(eventDate).toISOString(),
    location: eventLocation,
    description: eventDescription,
    organizerId: session.user.id,
    tickets: ticketsWithIds,
    image: 'event-1', // Default image, can be changed later
  };

  try {
    const eventsCol = collection(firestore, 'events');
    const docRef = await addDoc(eventsCol, newEvent);

    revalidatePath('/dashboard/events');
    return { id: docRef.id };
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement :', error);
    // Renvoyer une erreur plus explicite
    if (error instanceof Error) {
        throw new Error(`Impossible de créer l'événement dans la base de données: ${error.message}`);
    }
    throw new Error('Une erreur inconnue est survenue lors de la création de l\'événement.');
  }
}
