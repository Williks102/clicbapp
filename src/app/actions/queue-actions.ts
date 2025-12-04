'use server';

import { firestore } from '@/lib/firebase-admin';
import { QueueUser, QueueConfig } from '@/lib/types';

/**
 * Récupère la configuration de la file d'attente pour un événement
 */
export async function getQueueConfig(eventId: string): Promise<QueueConfig | null> {
  try {
    const queueConfigRef = firestore.collection('queueConfigs').doc(eventId);
    const doc = await queueConfigRef.get();

    if (!doc.exists) {
      // Configuration par défaut
      return {
        enabled: false,
        maxConcurrentUsers: 5,
        averageCheckoutTime: 300, // 5 minutes
      };
    }

    return doc.data() as QueueConfig;
  } catch (error) {
    console.error('Error getting queue config:', error);
    return null;
  }
}

/**
 * Active ou désactive la file d'attente pour un événement
 */
export async function setQueueEnabled(
  eventId: string,
  enabled: boolean,
  maxConcurrentUsers?: number,
  averageCheckoutTime?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const queueConfigRef = firestore.collection('queueConfigs').doc(eventId);

    const config: QueueConfig = {
      enabled,
      maxConcurrentUsers: maxConcurrentUsers ?? 5,
      averageCheckoutTime: averageCheckoutTime ?? 300,
    };

    await queueConfigRef.set(config, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error setting queue config:', error);
    return {
      success: false,
      error: 'Erreur lors de la configuration de la file d\'attente',
    };
  }
}

/**
 * Nettoie les utilisateurs expirés de la file d'attente
 */
export async function cleanExpiredQueueUsers(): Promise<{ success: boolean; cleaned: number }> {
  try {
    const now = new Date();
    const queuesRef = firestore.collection('queues');

    // Rechercher tous les utilisateurs expirés
    const expiredSnapshot = await queuesRef
      .where('expiresAt', '<=', now.toISOString())
      .get();

    // Supprimer en batch
    const batch = firestore.batch();
    expiredSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return {
      success: true,
      cleaned: expiredSnapshot.size,
    };
  } catch (error) {
    console.error('Error cleaning expired queue users:', error);
    return {
      success: false,
      cleaned: 0,
    };
  }
}

/**
 * Récupère les statistiques de la file d'attente pour un événement
 */
export async function getQueueStats(eventId: string, ticketId: string) {
  try {
    const queuesRef = firestore.collection('queues');
    const snapshot = await queuesRef
      .where('eventId', '==', eventId)
      .where('ticketId', '==', ticketId)
      .orderBy('joinedAt', 'asc')
      .get();

    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as QueueUser[];

    const now = new Date();
    const activeUsers = users.filter(u => {
      if (u.expiresAt) {
        return new Date(u.expiresAt) > now;
      }
      return true;
    });

    const waitingUsers = activeUsers.filter(u => u.status === 'waiting');
    const activeInCheckout = activeUsers.filter(u => u.status === 'active');

    return {
      totalInQueue: waitingUsers.length,
      activeInCheckout: activeInCheckout.length,
      users: activeUsers,
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return {
      totalInQueue: 0,
      activeInCheckout: 0,
      users: [],
    };
  }
}

/**
 * Vérifie si la file d'attente doit être activée automatiquement
 */
export async function shouldEnableQueue(eventId: string, ticketId: string): Promise<boolean> {
  try {
    // Récupérer la configuration
    const config = await getQueueConfig(eventId);
    if (!config?.enabled) return false;

    // Récupérer les statistiques
    const stats = await getQueueStats(eventId, ticketId);

    // Activer la queue si on approche de la limite
    return stats.activeInCheckout >= config.maxConcurrentUsers - 1;
  } catch (error) {
    console.error('Error checking if queue should be enabled:', error);
    return false;
  }
}
