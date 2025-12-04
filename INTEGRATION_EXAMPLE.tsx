/**
 * EXEMPLE D'INTÉGRATION DU SYSTÈME DE FILE D'ATTENTE
 *
 * Ce fichier montre comment intégrer le système de file d'attente
 * dans différentes parties de votre application.
 */

// ============================================
// EXEMPLE 1: Dans la page de modification d'événement
// ============================================

import { QueueConfigForm } from '@/components/queue-config-form';
import { getQueueConfig } from '@/app/actions/queue-actions';

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const queueConfig = await getQueueConfig(eventId);

  return (
    <div className="space-y-6">
      {/* Autres formulaires de l'événement */}

      {/* Configuration de la file d'attente */}
      <QueueConfigForm eventId={eventId} initialConfig={queueConfig ?? undefined} />
    </div>
  );
}

// ============================================
// EXEMPLE 2: Dashboard avec statistiques de la file
// ============================================

import { getQueueStats } from '@/app/actions/queue-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock } from 'lucide-react';

export async function EventQueueStats({ eventId, ticketId }: { eventId: string; ticketId: string }) {
  const stats = await getQueueStats(eventId, ticketId);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            En file d'attente
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalInQueue}</div>
          <p className="text-xs text-muted-foreground">
            Utilisateurs en attente
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            En checkout
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeInCheckout}</div>
          <p className="text-xs text-muted-foreground">
            Achats en cours
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// EXEMPLE 3: Activation conditionnelle avancée
// ============================================

import { shouldEnableQueue, getQueueConfig } from '@/app/actions/queue-actions';

async function handleBuyClick(eventId: string, ticketId: string, ticket: TicketTier) {
  // Stratégie 1: Basée sur la quantité restante
  const lowStock = ticket.quantity < 20;

  // Stratégie 2: Basée sur la configuration de l'événement
  const config = await getQueueConfig(eventId);
  const queueEnabledByOrganizer = config?.enabled ?? false;

  // Stratégie 3: Basée sur l'affluence actuelle
  const highTraffic = await shouldEnableQueue(eventId, ticketId);

  // Combiner les stratégies
  const shouldUseQueue = lowStock || queueEnabledByOrganizer || highTraffic;

  if (shouldUseQueue) {
    // Montrer la salle d'attente
    setShowQueue(true);
    await joinQueue();
  } else {
    // Aller directement au checkout
    router.push(`/events/${eventId}/checkout?ticketId=${ticketId}`);
  }
}

// ============================================
// EXEMPLE 4: Nettoyage automatique (Cloud Function)
// ============================================

/**
 * Cette fonction peut être déployée comme Cloud Function
 * et programmée pour s'exécuter toutes les 5 minutes via Cloud Scheduler
 */
import { cleanExpiredQueueUsers } from '@/app/actions/queue-actions';

export async function scheduledQueueCleanup() {
  console.log('Starting queue cleanup...');

  const result = await cleanExpiredQueueUsers();

  if (result.success) {
    console.log(`Successfully cleaned ${result.cleaned} expired queue users`);
  } else {
    console.error('Failed to clean queue users');
  }

  return result;
}

// ============================================
// EXEMPLE 5: Composant de monitoring en temps réel
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { QueueUser } from '@/lib/types';

export function LiveQueueMonitor({ eventId }: { eventId: string }) {
  const { firestore, areServicesAvailable } = useFirebase();
  const [queueUsers, setQueueUsers] = useState<QueueUser[]>([]);

  useEffect(() => {
    if (!areServicesAvailable || !firestore) return;

    const q = query(
      collection(firestore, 'queues'),
      where('eventId', '==', eventId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QueueUser[];

      setQueueUsers(users);
    });

    return () => unsubscribe();
  }, [areServicesAvailable, firestore, eventId]);

  const waitingCount = queueUsers.filter(u => u.status === 'waiting').length;
  const activeCount = queueUsers.filter(u => u.status === 'active').length;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">File d'attente en direct</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border p-3">
          <p className="text-2xl font-bold">{waitingCount}</p>
          <p className="text-sm text-muted-foreground">En attente</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-2xl font-bold">{activeCount}</p>
          <p className="text-sm text-muted-foreground">En checkout</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXEMPLE 6: Personnalisation de l'interface
// ============================================

import { QueueWaitingRoom } from '@/components/queue-waiting-room';

export function CustomQueueWaitingRoom({ queueState, onCancel, onProceed }) {
  return (
    <QueueWaitingRoom
      queueState={queueState}
      onCancel={async () => {
        // Ajouter une confirmation
        if (confirm('Êtes-vous sûr de vouloir quitter la file d\'attente ?')) {
          await onCancel();
        }
      }}
      onProceed={() => {
        // Ajouter une analytics ou notification
        console.log('User proceeding to checkout');
        onProceed();
      }}
    />
  );
}
