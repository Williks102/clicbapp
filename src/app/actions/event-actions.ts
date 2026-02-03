'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin'; // ✅ Plus besoin de 'storage'
import { revalidatePath } from 'next/cache';
import type { Event, TicketTier } from '@/lib/types';
import type { EventFormValues } from '@/app/dashboard/events/create/page';

// ==================== SCHEMAS ====================

const ticketSchema = z.object({
  id: z.string().optional(),
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
  eventDescriptionKeywords: z.string().optional(),
  tickets: z.array(ticketSchema).min(1, 'Au moins un type de billet est requis.'),
  image: z.string().url().optional(), // ✅ URL Cloudinary
  livestreamEnabled: z.boolean().default(false),
  livestreamTitle: z.string().optional(),
  livestreamTicketPrice: z.coerce.number().optional(),
}).refine(data => {
    if (data.livestreamEnabled) {
        return !!data.livestreamTitle && data.livestreamTicketPrice !== undefined && data.livestreamTicketPrice >= 0;
    }
    return true;
}, {
    message: 'Le titre et le prix du livestream sont requis si le streaming est activé.',
    path: ['livestreamTitle'],
});

// ==================== CREATE EVENT ====================

export async function createEvent(data: EventFormValues) {
  try {
    console.log('[CREATE EVENT] 📝 Starting event creation...');
    
    // 1. Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Vous devez être connecté pour créer un événement.');
    }
    console.log('[CREATE EVENT] ✅ User authenticated:', session.user.id);

    // 2. Valider les données
    const validatedData = formSchema.safeParse(data);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.errors.map(e => e.message).join(', ');
      console.error('[CREATE EVENT] ❌ Validation failed:', errorMessages);
      throw new Error(`Données invalides: ${errorMessages}`);
    }
    console.log('[CREATE EVENT] ✅ Data validated');

    const {
      eventName,
      eventCategory,
      eventDate,
      eventLocation,
      eventDescription,
      tickets,
      image,
      livestreamEnabled,
      livestreamTitle,
      livestreamTicketPrice
    } = validatedData.data;

    // ✅ L'image vient directement du Cloudinary widget (URL)
    const imageUrl = image || 'event-1'; // Default si pas d'image
    console.log('[CREATE EVENT] 🖼️ Image URL:', imageUrl);

    // 3. Préparer les tickets avec IDs
    const ticketsWithIds: TicketTier[] = tickets.map((t, index) => ({
      id: t.id || `tkt-${Date.now()}-${index}`,
      name: t.name,
      price: t.price,
      quantity: t.quantity,
    }));

    // 4. Créer l'événement
    const newEvent: Omit<Event, 'id'> = {
      name: eventName,
      category: eventCategory,
      date: new Date(eventDate).toISOString(),
      location: eventLocation,
      description: eventDescription,
      organizerId: session.user.id,
      tickets: ticketsWithIds,
      image: imageUrl, // ✅ URL Cloudinary directe
    };

    if (livestreamEnabled && livestreamTitle && livestreamTicketPrice !== undefined) {
      newEvent.livestream = {
        enabled: true,
        title: livestreamTitle,
        ticketPrice: livestreamTicketPrice
      }
    }

    console.log('[CREATE EVENT] 💾 Saving to Firestore...');

    // 5. Sauvegarder dans Firestore
    const eventsCol = firestore.collection('events');
    const docRef = await eventsCol.add(newEvent);

    console.log('[CREATE EVENT] ✅ Event created with ID:', docRef.id);

    revalidatePath('/dashboard/events');
    return { id: docRef.id };
    
  } catch (error) {
    console.error('[CREATE EVENT] ❌ Fatal error:', error);
    
    if (error instanceof Error) {
      throw new Error(`Erreur création événement: ${error.message}`);
    }
    throw new Error('Une erreur inconnue est survenue lors de la création de l\'événement.');
  }
}

// ==================== UPDATE EVENT ====================

export async function updateEvent(eventId: string, data: EventFormValues) {
  try {
    console.log('[UPDATE EVENT] 📝 Starting event update...', eventId);
    
    // 1. Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Vous devez être connecté pour modifier un événement.');
    }
    console.log('[UPDATE EVENT] ✅ User authenticated:', session.user.id);

    // 2. Vérifier que l'événement existe et appartient à l'utilisateur
    const eventDoc = await firestore.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new Error('Événement introuvable.');
    }

    const eventData = eventDoc.data() as Event;
    if (eventData.organizerId !== session.user.id) {
      throw new Error('Vous n\'êtes pas autorisé à modifier cet événement.');
    }

    // 3. Valider les données
    const validatedData = formSchema.safeParse(data);
    if (!validatedData.success) {
      const errorMessages = validatedData.error.errors.map(e => e.message).join(', ');
      console.error('[UPDATE EVENT] ❌ Validation failed:', errorMessages);
      throw new Error(`Données invalides: ${errorMessages}`);
    }
    console.log('[UPDATE EVENT] ✅ Data validated');

    const {
      eventName,
      eventCategory,
      eventDate,
      eventLocation,
      eventDescription,
      tickets,
      image,
      livestreamEnabled,
      livestreamTitle,
      livestreamTicketPrice
    } = validatedData.data;

    // ✅ Utiliser nouvelle image ou garder l'ancienne
    const imageUrl = image || eventData.image;
    console.log('[UPDATE EVENT] 🖼️ Image URL:', imageUrl);

    // 4. Préparer les tickets avec IDs
    const ticketsWithIds: TicketTier[] = tickets.map((t, index) => ({
      id: t.id || `tkt-${Date.now()}-${index}`,
      name: t.name,
      price: t.price,
      quantity: t.quantity,
    }));

    // 5. Mettre à jour l'événement
    const updatedEventData: Partial<Event> = {
      name: eventName,
      category: eventCategory,
      date: new Date(eventDate).toISOString(),
      location: eventLocation,
      description: eventDescription,
      tickets: ticketsWithIds,
      image: imageUrl, // ✅ URL Cloudinary
    };

    if (livestreamEnabled && livestreamTitle && livestreamTicketPrice !== undefined) {
      updatedEventData.livestream = {
        enabled: true,
        title: livestreamTitle,
        ticketPrice: livestreamTicketPrice
      };
    } else {
      updatedEventData.livestream = {
        enabled: false,
        title: '',
        ticketPrice: 0
      };
    }

    console.log('[UPDATE EVENT] 💾 Updating in Firestore...');

    await firestore.collection('events').doc(eventId).update(updatedEventData);

    console.log('[UPDATE EVENT] ✅ Event updated successfully');

    revalidatePath('/dashboard/events');
    revalidatePath(`/events/${eventId}`);
    
    return { success: true };
    
  } catch (error) {
    console.error('[UPDATE EVENT] ❌ Fatal error:', error);
    
    if (error instanceof Error) {
      throw new Error(`Erreur mise à jour événement: ${error.message}`);
    }
    throw new Error('Une erreur inconnue est survenue lors de la mise à jour de l\'événement.');
  }
}
