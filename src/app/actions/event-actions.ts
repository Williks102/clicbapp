'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { firestore, storage } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { Event, TicketTier } from '@/lib/types';
import type { EventFormValues } from '@/app/dashboard/events/create/page';
import { v4 as uuidv4 } from 'uuid';

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


export async function createEvent(data: EventFormValues, formData: FormData) {
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
      throw new Error(`Données du formulaire invalides: ${errorMessages}`);
    }
    console.log('[CREATE EVENT] ✅ Data validated');

    const {
      eventName,
      eventCategory,
      eventDate,
      eventLocation,
      eventDescription,
      tickets,
    } = validatedData.data;
    
    let imageUrl = 'event-1'; // Default image

    // 3. Gérer l'upload de l'image
    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0) {
      try {
        console.log('[CREATE EVENT] 📤 Uploading image:', imageFile.name, `(${imageFile.size} bytes)`);
        
        const fileExtension = imageFile.name.split('.').pop();
        const imageFileName = `events/${uuidv4()}.${fileExtension}`;
        const file = storage.file(imageFileName);

        const buffer = Buffer.from(await imageFile.arrayBuffer());
        
        await file.save(buffer, {
          metadata: {
            contentType: imageFile.type,
          },
        });

        // Rendre le fichier public et obtenir l'URL
        await file.makePublic();
        imageUrl = file.publicUrl();
        
        console.log('[CREATE EVENT] ✅ Image uploaded:', imageUrl);
      } catch (uploadError) {
        console.error('[CREATE EVENT] ⚠️ Image upload failed:', uploadError);
        // Continue avec l'image par défaut si l'upload échoue
        console.log('[CREATE EVENT] ℹ️ Using default image');
      }
    } else {
      console.log('[CREATE EVENT] ℹ️ No image provided, using default');
    }

    // 4. Préparer les données de l'événement
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
      image: imageUrl, 
    };

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
export async function updateEvent(eventId: string, data: EventFormValues, formData: FormData) {
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
      throw new Error(`Données du formulaire invalides: ${errorMessages}`);
    }
    console.log('[UPDATE EVENT] ✅ Data validated');

    const {
      eventName,
      eventCategory,
      eventDate,
      eventLocation,
      eventDescription,
      tickets,
    } = validatedData.data;
    
    let imageUrl = eventData.image; // Garder l'image actuelle par défaut

    // 4. Gérer l'upload de la nouvelle image (si fournie)
    const imageFile = formData.get('image') as File;
    if (imageFile && imageFile.size > 0) {
      try {
        console.log('[UPDATE EVENT] 📤 Uploading new image:', imageFile.name, `(${imageFile.size} bytes)`);
        
        const fileExtension = imageFile.name.split('.').pop();
        const imageFileName = `events/${uuidv4()}.${fileExtension}`;
        const file = storage.file(imageFileName);

        const buffer = Buffer.from(await imageFile.arrayBuffer());
        
        await file.save(buffer, {
          metadata: {
            contentType: imageFile.type,
          },
        });

        // Rendre le fichier public et obtenir l'URL
        await file.makePublic();
        imageUrl = file.publicUrl();
        
        console.log('[UPDATE EVENT] ✅ New image uploaded:', imageUrl);
      } catch (uploadError) {
        console.error('[UPDATE EVENT] ⚠️ Image upload failed:', uploadError);
        // Continue avec l'ancienne image si l'upload échoue
        console.log('[UPDATE EVENT] ℹ️ Keeping existing image');
      }
    } else {
      console.log('[UPDATE EVENT] ℹ️ No new image provided, keeping existing');
    }

    // 5. Préparer les données de mise à jour
    const ticketsWithIds: TicketTier[] = tickets.map((t, index) => ({
      ...t,
      id: t.id || `tkt-${Date.now()}-${index}`, // Garder l'ID existant ou en créer un nouveau
    }));

    const updatedEvent: Partial<Event> = {
      name: eventName,
      category: eventCategory,
      date: new Date(eventDate).toISOString(),
      location: eventLocation,
      description: eventDescription,
      tickets: ticketsWithIds,
      image: imageUrl,
    };

    console.log('[UPDATE EVENT] 💾 Updating in Firestore...');

    // 6. Mettre à jour dans Firestore
    await firestore.collection('events').doc(eventId).update(updatedEvent);

    console.log('[UPDATE EVENT] ✅ Event updated successfully:', eventId);

    revalidatePath('/dashboard/events');
    revalidatePath(`/events/${eventId}`);
    
    return { id: eventId };
    
  } catch (error) {
    console.error('[UPDATE EVENT] ❌ Fatal error:', error);
    
    if (error instanceof Error) {
      throw new Error(`Erreur modification événement: ${error.message}`);
    }
    throw new Error('Une erreur inconnue est survenue lors de la modification de l\'événement.');
  }
}
