'use client';

import { PageHeader } from '@/components/page-header';
import ElectronicTicket from '@/components/electronic-ticket';
import { useSession } from 'next-auth/react';
import { useCollection, useFirebase } from '@/firebase';
import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import type { Sale, Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { redirect } from 'next/navigation';

export default function MyTicketsPage() {
  const { data: session, status } = useSession();
  const { firestore } = useFirebase();
  const isLoadingSession = status === 'loading';

  // ✅ Rediriger si non authentifié
  if (status === 'unauthenticated') {
    redirect('/login');
  }

  // ✅ Ne créer les queries QUE si authentifié
  const userTicketsQuery = useMemo(() => {
    if (firestore && session?.user?.email && status === 'authenticated') {
      return query(
        collection(firestore, 'sales'), 
        where('customerEmail', '==', session.user.email)
      );
    }
    return null;
  }, [firestore, session?.user?.email, status]);

  const allEventsQuery = useMemo(() => {
    if (firestore && status === 'authenticated') {
      return collection(firestore, 'events');
    }
    return null;
  }, [firestore, status]);

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(userTicketsQuery);
  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(allEventsQuery);
  
  const isLoading = isLoadingSession || isLoadingSales || isLoadingEvents;
  
  // ✅ CORRECTION: Filtrer les tickets invalides ET s'assurer que tous les champs sont définis
  const purchasedTickets = useMemo(() => {
    if (!sales || !events) return [];

    return sales
      .map(sale => {
        const event = events.find(e => e.id === sale.eventId);
        if (!event) return null;

        const ticket = event.tickets.find(t => t.id === sale.ticketId);
        if (!ticket) return null;

        // ✅ Retourner un objet avec TOUS les champs requis et non-undefined
        return {
          event,           // Event (non-undefined)
          ticket,          // TicketTier (non-undefined)
          quantity: sale.quantity,
          fullName: sale.customerName,
          orderId: sale.id,
          ticketNumber: `TKT-${sale.id.split('-')[1] || sale.id.substring(0, 8)}`,
        };
      })
      .filter((ticket): ticket is NonNullable<typeof ticket> => ticket !== null);
      // ✅ TypeScript sait maintenant que les éléments ne sont PAS null
  }, [sales, events]);

  // ✅ Afficher un loading pendant l'authentification
  if (isLoadingSession) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Mes Billets"
          description="Chargement..."
        />
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes Billets"
        description="Retrouvez ici tous les billets pour vos événements à venir."
      />
      {isLoading ? (
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : purchasedTickets.length === 0 ? (
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