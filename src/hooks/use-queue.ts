import { useEffect, useState, useCallback, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { QueueState, QueueUser } from '@/lib/types';

const QUEUE_TIMEOUT = 10 * 60 * 1000; // 10 minutes en millisecondes
const AVERAGE_CHECKOUT_TIME = 5 * 60; // 5 minutes en secondes
const MAX_CONCURRENT_USERS = 5; // Nombre max d'utilisateurs en checkout simultanément

export function useQueue(eventId: string, ticketId: string) {
  const { firestore, areServicesAvailable } = useFirebase();
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const [isLoading, setIsLoading] = useState(true);

  // Générer un ID unique pour l'utilisateur dans la queue
  const queueUserId = useMemo(
    () => `${eventId}_${ticketId}_${sessionId}`,
    [eventId, ticketId, sessionId]
  );

  // Rejoindre la file d'attente
  const joinQueue = useCallback(async () => {
    if (!areServicesAvailable || !firestore) return;

    try {
      const queueRef = doc(firestore, 'queues', queueUserId);
      const queueUser: Omit<QueueUser, 'id'> = {
        sessionId,
        eventId,
        ticketId,
        joinedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + QUEUE_TIMEOUT).toISOString(),
        status: 'waiting',
      };

      await setDoc(queueRef, {
        ...queueUser,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error joining queue:', error);
    }
  }, [areServicesAvailable, firestore, queueUserId, sessionId, eventId, ticketId]);

  // Quitter la file d'attente
  const leaveQueue = useCallback(async () => {
    if (!areServicesAvailable || !firestore) return;

    try {
      const queueRef = doc(firestore, 'queues', queueUserId);
      await deleteDoc(queueRef);
    } catch (error) {
      console.error('Error leaving queue:', error);
    }
  }, [areServicesAvailable, firestore, queueUserId]);

  // Marquer comme actif (l'utilisateur peut procéder au checkout)
  const markAsActive = useCallback(async () => {
    if (!areServicesAvailable || !firestore) return;

    try {
      const queueRef = doc(firestore, 'queues', queueUserId);
      await updateDoc(queueRef, {
        status: 'active',
        activatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking as active:', error);
    }
  }, [areServicesAvailable, firestore, queueUserId]);

  // Écouter les changements de la file d'attente
  useEffect(() => {
    if (!areServicesAvailable || !firestore || !eventId || !ticketId) {
      setIsLoading(false);
      return;
    }

    const queuesRef = collection(firestore, 'queues');
    const q = query(
      queuesRef,
      where('eventId', '==', eventId),
      where('ticketId', '==', ticketId),
      orderBy('joinedAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allUsers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as QueueUser[];

        // Filtrer les utilisateurs expirés
        const now = new Date();
        const activeUsers = allUsers.filter(user => {
          if (user.expiresAt) {
            return new Date(user.expiresAt) > now;
          }
          return true;
        });

        // Séparer les utilisateurs en attente et actifs
        const waitingUsers = activeUsers.filter(u => u.status === 'waiting');
        const activeUsersInCheckout = activeUsers.filter(u => u.status === 'active');

        // Trouver la position de l'utilisateur actuel
        const userIndex = waitingUsers.findIndex(u => u.id === queueUserId);
        const isUserActive = activeUsersInCheckout.some(u => u.id === queueUserId);

        if (userIndex !== -1) {
          // L'utilisateur est dans la file d'attente
          const position = userIndex + 1;
          const usersAhead = position - 1;

          // Calculer le temps d'attente estimé
          const activeSlots = MAX_CONCURRENT_USERS - activeUsersInCheckout.length;
          const waitingAhead = Math.max(0, usersAhead - activeSlots);
          const estimatedWaitTime = Math.ceil(
            (waitingAhead / MAX_CONCURRENT_USERS) * AVERAGE_CHECKOUT_TIME
          );

          setQueueState({
            position,
            totalInQueue: waitingUsers.length,
            estimatedWaitTime,
            status: 'waiting',
            joinedAt: new Date(waitingUsers[userIndex].joinedAt),
          });

          // Si l'utilisateur est assez haut dans la queue, le marquer comme actif
          if (position <= MAX_CONCURRENT_USERS && activeUsersInCheckout.length < MAX_CONCURRENT_USERS) {
            markAsActive();
          }
        } else if (isUserActive) {
          // L'utilisateur est actif et peut procéder au checkout
          setQueueState({
            position: 0,
            totalInQueue: waitingUsers.length,
            estimatedWaitTime: 0,
            status: 'active',
            joinedAt: new Date(),
          });
        } else {
          // L'utilisateur n'est pas dans la queue
          setQueueState(null);
        }

        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to queue:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [areServicesAvailable, firestore, eventId, ticketId, queueUserId, markAsActive]);

  // Nettoyer quand le composant est démonté
  useEffect(() => {
    return () => {
      if (queueState?.status === 'waiting') {
        leaveQueue();
      }
    };
  }, [queueState?.status, leaveQueue]);

  return {
    queueState,
    isLoading,
    joinQueue,
    leaveQueue,
    sessionId,
  };
}
