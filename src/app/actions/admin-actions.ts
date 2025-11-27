'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type { Event, User } from '@/lib/types';

/**
 * Récupère tous les événements (admin seulement)
 */
export async function getAllEvents(): Promise<Event[]> {
  try {
    console.log('[ADMIN EVENTS] 📋 Fetching all events...');
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      console.log('[ADMIN EVENTS] ❌ Not authenticated');
      return [];
    }

    // TODO: Vérifier que c'est un admin
    // Pour l'instant, on récupère tous les événements
    
    const eventsSnapshot = await firestore.collection('events').get();
    
    const events: Event[] = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Event[];

    console.log(`[ADMIN EVENTS] ✅ Fetched ${events.length} events`);
    return events;

  } catch (error) {
    console.error('[ADMIN EVENTS] ❌ Error:', error);
    return [];
  }
}

/**
 * Récupère tous les utilisateurs (admin seulement)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    console.log('[ADMIN USERS] 👥 Fetching all users...');
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      console.log('[ADMIN USERS] ❌ Not authenticated');
      return [];
    }

    // TODO: Vérifier que c'est un admin
    
    const usersSnapshot = await firestore.collection('users').get();
    
    const users: User[] = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];

    console.log(`[ADMIN USERS] ✅ Fetched ${users.length} users`);
    return users;

  } catch (error) {
    console.error('[ADMIN USERS] ❌ Error:', error);
    return [];
  }
}

/**
 * Supprime un événement (admin seulement)
 */
export async function deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[ADMIN DELETE EVENT] 🗑️ Deleting event:', eventId);
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    // TODO: Vérifier que c'est un admin
    
    await firestore.collection('events').doc(eventId).delete();

    console.log('[ADMIN DELETE EVENT] ✅ Event deleted');
    return { success: true };

  } catch (error) {
    console.error('[ADMIN DELETE EVENT] ❌ Error:', error);
    return { success: false, error: 'Erreur lors de la suppression' };
  }
}

/**
 * Met à jour le statut d'un utilisateur (admin seulement)
 */
export async function updateUserStatus(
  userId: string, 
  disabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[ADMIN UPDATE USER] 👤 Updating user:', userId);
    
    // Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Non authentifié' };
    }

    // TODO: Vérifier que c'est un admin
    
    await firestore.collection('users').doc(userId).update({
      disabled,
    });

    console.log('[ADMIN UPDATE USER] ✅ User updated');
    return { success: true };

  } catch (error) {
    console.error('[ADMIN UPDATE USER] ❌ Error:', error);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
}