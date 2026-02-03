
'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { Event, TicketTier, LivestreamAccess, ActionResult } from '@/lib/types';
import type { EventFormValues } from '@/app/dashboard/events/create/page';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
  watchUrl: z.string().url('Veuillez entrer une URL valide').optional().or(z.literal('')),
  streamUrl: z.string().url('Veuillez entrer une URL valide').optional().or(z.literal('')),
  streamKey: z.string().optional(),
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
      livestreamTicketPrice,
      watchUrl,
      streamUrl,
      streamKey,
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
        ticketPrice: livestreamTicketPrice,
        isLive: false,
        watchUrl: watchUrl || '',
        streamUrl: streamUrl || '',
        streamKey: streamKey || '',
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
      livestreamTicketPrice,
      watchUrl,
      streamUrl,
      streamKey,
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
        ticketPrice: livestreamTicketPrice,
        isLive: eventData.livestream?.isLive || false, // preserve existing live status
        watchUrl: watchUrl || '',
        streamUrl: streamUrl || '',
        streamKey: streamKey || '',
      };
    } else {
      updatedEventData.livestream = {
        enabled: false,
        title: '',
        ticketPrice: 0,
        isLive: false,
        watchUrl: '',
        streamUrl: '',
        streamKey: '',
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


export async function setLiveStatus(eventId: string, isLive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Non authentifié.');
    }

    const eventDocRef = firestore.collection('events').doc(eventId);
    const eventDoc = await eventDocRef.get();

    if (!eventDoc.exists) {
      throw new Error('Événement introuvable.');
    }

    const eventData = eventDoc.data() as Event;
    if (eventData.organizerId !== session.user.id) {
      throw new Error('Non autorisé.');
    }

    if (!eventData.livestream?.enabled) {
        throw new Error('Le livestream n\'est pas activé pour cet événement.');
    }

    await eventDocRef.update({
      'livestream.isLive': isLive,
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/dashboard/events/edit/${eventId}`);

    return { success: true };
  } catch (error) {
    console.error(`[SET LIVE STATUS] ❌ Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour du statut';
    return { success: false, error: errorMessage };
  }
}

/**
 * Checks if the current user has purchased access to a specific livestream.
 */
export async function checkLivestreamAccess(eventId: string): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return false; // Not logged in, no access
    }

    const accessRef = firestore.collection('livestream_access');
    const snapshot = await accessRef
      .where('userId', '==', session.user.id)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error('[CHECK LIVESTREAM ACCESS] Error:', error);
    return false;
  }
}

async function sendLivestreamAccessEmail({
  user,
  event,
}: {
  user: { name?: string | null; email?: string | null };
  event: Event;
}) {
  if (!user.email || !user.name || !event.livestream) return;

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });

  const eventUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://clicbillet.com'}/events/${event.id}`;
  const subject = `📺 Accès confirmé pour le direct : ${event.name}`;

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; }
      .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f7f7f7; padding: 20px; }
      .info-card { background: #fff; border-radius: 10px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0e0;}
      .event-name { font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 15px; }
      .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
      .action-button { background-color: #667eea; color: white !important; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 20px;}
      .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="header"><h1>ClicBillet</h1><p>Confirmation d'accès au direct</p></div>
    <div class="content">
      <p>Bonjour ${user.name},</p>
      <p>Merci pour votre achat ! Votre accès au direct pour l'événement <strong>${event.name}</strong> est confirmé.</p>
      
      <div class="info-card">
        <div class="event-name">${event.livestream.title}</div>
        <div class="info-row"><span>Événement</span><span>${event.name}</span></div>
        <div class="info-row"><span>📅 Date</span><span>${formattedDate} à ${formattedTime}</span></div>
        <div class="info-row"><strong>Total Payé</strong><strong>${event.livestream.ticketPrice.toLocaleString('fr-FR')} F CFA</strong></div>
      </div>

      <div style="text-align: center;">
        <p>Pour regarder le direct, connectez-vous à votre compte ClicBillet et cliquez sur le bouton ci-dessous :</p>
        <a href="${eventUrl}" class="action-button">Regarder le direct</a>
      </div>

      <p style="margin-top: 20px;">À bientôt !<br><strong>L'équipe ClicBillet</strong></p>
    </div>
    <div class="footer"><p>© ${new Date().getFullYear()} ClicBillet</p></div>
  </body>
  </html>
  `;

  await resend.emails.send({
    from: 'ClicBillet <contact@monticket.online>',
    to: user.email,
    subject,
    html: htmlBody,
  });
}


/**
 * Simulates purchasing access to a livestream and records it.
 */
export async function purchaseLivestreamAccess(eventId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return { success: false, error: 'Vous devez être connecté pour acheter un accès.' };
    }
    
    const eventDoc = await firestore.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
        return { success: false, error: 'Événement introuvable.' };
    }
    const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

    if (!event.livestream?.enabled || event.livestream.ticketPrice === undefined) {
        return { success: false, error: 'Le direct n\'est pas disponible ou son prix n\'est pas défini.' };
    }
    const price = event.livestream.ticketPrice;

    const alreadyHasAccess = await checkLivestreamAccess(eventId);
    if (alreadyHasAccess) {
      return { success: false, error: 'Vous avez déjà acheté un accès pour ce direct.' };
    }
    
    console.log(`[PURCHASE LIVESTREAM] Simulating payment of ${price} FCFA for user ${session.user.id}`);

    const accessData: Omit<LivestreamAccess, 'id'> = {
      userId: session.user.id,
      eventId: eventId,
      purchaseDate: new Date().toISOString(),
      pricePaid: price,
    };
    
    await firestore.collection('livestream_access').add(accessData);
    console.log(`[PURCHASE LIVESTREAM] Access granted for event ${eventId} to user ${session.user.id}`);

    try {
      await sendLivestreamAccessEmail({ user: session.user, event });
      console.log(`[PURCHASE LIVESTREAM] Confirmation email sent to ${session.user.email}`);
    } catch (emailError) {
      console.error('[PURCHASE LIVESTREAM] ⚠️ Email sending failed:', emailError);
    }

    revalidatePath(`/events/${eventId}`);

    return { success: true, message: 'Accès au direct acheté avec succès ! Un email de confirmation a été envoyé.' };

  } catch (error) {
    console.error('[PURCHASE LIVESTREAM] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
    return { success: false, error: errorMessage };
  }
}
