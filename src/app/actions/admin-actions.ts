'use server';

import { auth } from '@/auth';
import { firestore } from '@/lib/firebase-admin';
import type { Competition, User } from '@/lib/types';

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
 * Récupère tous les concours (admin seulement)
 */
export async function getAllCompetitions(): Promise<Competition[]> {
  try {
    await ensureAdmin();
    console.log('[ADMIN COMPETITIONS] 📋 Fetching all competitions...');

    const snapshot = await firestore.collection('competitions').get();

    const competitions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Competition[];

    console.log(`[ADMIN COMPETITIONS] ✅ Fetched ${competitions.length} competitions`);
    return competitions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  } catch (error) {
    console.error('[ADMIN COMPETITIONS] ❌ Error:', error);
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
 * Supprime un concours et ses candidats (admin seulement)
 */
export async function deleteCompetitionAsAdmin(
  competitionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAdmin();
    console.log('[ADMIN DELETE COMPETITION] 🗑️ Deleting competition:', competitionId);

    const batch = firestore.batch();

    const candidates = await firestore
      .collection('candidates')
      .where('competitionId', '==', competitionId)
      .get();
    candidates.docs.forEach(doc => batch.delete(doc.ref));

    batch.delete(firestore.collection('competitions').doc(competitionId));
    await batch.commit();

    console.log('[ADMIN DELETE COMPETITION] ✅ Competition deleted');
    return { success: true };

  } catch (error) {
    console.error('[ADMIN DELETE COMPETITION] ❌ Error:', error);
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
