'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type { Event, User } from '@/lib/types';

/**
 * Helper function to verify admin role
 */
async function ensureAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('Accès non autorisé. Seuls les administrateurs sont permis.');
  }
  return session.user;
}

/**
 * Récupère tous les événements (admin seulement)
 */
export async function getAllEvents(): Promise<Event[]> {
  try {
    await ensureAdmin();
    console.log('[ADMIN EVENTS] 📋 Fetching all events...');
    
    const eventsSnapshot = await firestore.collection('events').get();
    
    const events: Event[] = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Event[];

    console.log(`[ADMIN EVENTS] ✅ Fetched ${events.length} events`);
    return events;

  } catch (error) {
    console.error('[ADMIN EVENTS] ❌ Error:', error);
    if (error instanceof Error && error.message.includes('Accès non autorisé')) {
      throw error;
    }
    return [];
  }
}

/**
 * Récupère tous les utilisateurs (admin seulement)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    await ensureAdmin();
    console.log('[ADMIN USERS] 👥 Fetching all users...');
    
    const usersSnapshot = await firestore.collection('users').get();
    
    const users: User[] = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];

    console.log(`[ADMIN USERS] ✅ Fetched ${users.length} users`);
    return users;

  } catch (error) {
    console.error('[ADMIN USERS] ❌ Error:', error);
    if (error instanceof Error && error.message.includes('Accès non autorisé')) {
      throw error;
    }
    return [];
  }
}

/**
 * Supprime un événement (admin seulement)
 */
export async function deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAdmin();
    console.log('[ADMIN DELETE EVENT] 🗑️ Deleting event:', eventId);
    
    await firestore.collection('events').doc(eventId).delete();

    console.log('[ADMIN DELETE EVENT] ✅ Event deleted');
    return { success: true };

  } catch (error) {
    console.error('[ADMIN DELETE EVENT] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression';
    return { success: false, error: errorMessage };
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
    await ensureAdmin();
    console.log('[ADMIN UPDATE USER] 👤 Updating user:', userId);
    
    await firestore.collection('users').doc(userId).update({
      disabled,
    });

    console.log('[ADMIN UPDATE USER] ✅ User updated');
    return { success: true };

  } catch (error) {
    console.error('[ADMIN UPDATE USER] ❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour';
    return { success: false, error: errorMessage };
  }
}
