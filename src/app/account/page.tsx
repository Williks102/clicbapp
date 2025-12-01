'use client';

import { PageHeader } from '@/components/page-header';
import ElectronicTicket from '@/components/electronic-ticket';
import { useSession } from 'next-auth/react';
import { useCollection, useFirebase } from '@/firebase';
import { useMemo, useEffect } from 'react';
import { collection, query, where } from 'firebase/firestore';
import type { Sale, Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

export default function MyTicketsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { firestore, areServicesAvailable } = useFirebase();

  // ✅ SOLUTION 1: Rediriger si pas authentifié (useEffect pour éviter les erreurs SSR)
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // ✅ SOLUTION 2: Ne créer les queries QUE si TOUT est prêt
  const isReady = status === 'authenticated' && 
                  areServicesAvailable && 
                  firestore && 
                  session?.user?.email;

  const userTicketsQuery = useMemo(() => {
    // ✅ CRITIQUE: Ne retourner une query QUE si TOUT est prêt
    if (!isReady) return null;
    
    return query(
      collection(firestore, 'sales'), 
      where('customerEmail', '==', session.user.email)
    );
  }, [isReady, firestore, session?.user?.email]);

  const allEventsQuery = useMemo(() => {
    // ✅ CRITIQUE: Ne retourner une query QUE si TOUT est prêt
    if (!isReady) return null;
    
    return collection(firestore, 'events');
  }, [isReady, firestore]);

  // ✅ SOLUTION 3: useCollection ne s'exécute QUE si les queries sont définies
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(userTicketsQuery);
  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(allEventsQuery);
  
  // ✅ État de chargement global
  const isLoading = status === 'loading' || 
                    !areServicesAvailable || 
                    !isReady ||
                    isLoadingSales || 
                    isLoadingEvents;
  
  // ✅ SOLUTION 4: Filtrer proprement avec type predicate
  const purchasedTickets = useMemo(() => {
    if (!sales || !events) return [];

    return sales
      .map(sale => {
        const event = events.find(e => e.id === sale.eventId);
        if (!event) return null;

        const ticket = event.tickets.find(t => t.id === sale.ticketId);
        if (!ticket) return null;

        return {
          event,
          ticket,
          quantity: sale.quantity,
          fullName: sale.customerName,
          orderId: sale.id,
          ticketNumber: `TKT-${sale.id.split('-')[1] || sale.id.substring(0, 8)}`,
        };
      })
      .filter((ticket): ticket is NonNullable<typeof ticket> => ticket !== null);
  }, [sales, events]);

  // ✅ SOLUTION 5: Afficher un loading propre si pas prêt
  if (status === 'loading' || !areServicesAvailable) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Mes Billets"
          description="Chargement de vos billets..."
        />
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // ✅ SOLUTION 6: Ne rien afficher si pas authentifié (évite le flash)
  if (status === 'unauthenticated') {
    return null; // Le useEffect redirigera
  }

  // ✅ SOLUTION 7: Afficher loading si les données chargent
  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Mes Billets"
          description="Chargement de vos billets..."
        />
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // ✅ À ce stade, TOUT est chargé et prêt
  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes Billets"
        description="Retrouvez ici tous les billets pour vos événements à venir."
      />
      {purchasedTickets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg font-medium">Aucun billet pour le moment</p>
          <p className="text-sm text-muted-foreground mt-2">
            Parcourez nos événements et achetez vos premiers billets !
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {purchasedTickets.map((ticket, index) => (
            <ElectronicTicket 
              key={index} 
              event={ticket.event}
              ticket={ticket.ticket}
              quantity={ticket.quantity}
              fullName={ticket.fullName}
              orderId={ticket.orderId}
              ticketNumber={ticket.ticketNumber}
            />
          ))}
        </div>
      )}
    </div>
  );
}