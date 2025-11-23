
'use client';

import { PageHeader } from '@/components/page-header';
import ElectronicTicket from '@/components/electronic-ticket';
import { useSession } from 'next-auth/react';
import { useCollection, useFirebase } from '@/firebase';
import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import type { Sale, Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function MyTicketsPage() {
  const { data: session, status } = useSession();
  const { firestore } = useFirebase();
  const isLoadingSession = status === 'loading';

  const userTicketsQuery = useMemo(() => {
    if (firestore && session?.user?.id) {
      return query(collection(firestore, 'sales'), where('customerEmail', '==', session.user.email));
    }
    return null;
  }, [firestore, session]);

  const allEventsQuery = useMemo(() => {
    if (firestore) {
      return collection(firestore, 'events');
    }
    return null;
  }, [firestore]);

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(userTicketsQuery);
  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(allEventsQuery);
  
  const isLoading = isLoadingSession || isLoadingSales || isLoadingEvents;
  
  const purchasedTickets = useMemo(() => {
    if (!sales || !events) return [];

    return sales
      .map(sale => {
        const event = events.find(e => e.id === sale.eventId);
        if (!event) return null;

        const ticket = event?.tickets.find(t => t.id === sale.ticketId);
        if (!event || !ticket) return null;

        return {
          event,
          ticket,
          quantity: sale.quantity,
          fullName: sale.customerName,
          orderId: sale.id,
          ticketNumber: `TKT-${sale.id.split('-')[1]}`,
        };
      })
      .filter(Boolean);
  }, [sales, events]);


  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes Billets"
        description="Retrouvez ici tous les billets pour vos événements à venir."
      />
      {isLoading ? (
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
            <Skeleton className="h-[450px] w-full rounded-lg" />
            <Skeleton className="h-[450px] w-full rounded-lg" />
        </div>
      ) : (
        <>
            <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
                {purchasedTickets.map((purchase, index) => (
                purchase && <div key={index}>
                    <ElectronicTicket 
                    event={purchase.event}
                    ticket={purchase.ticket}
                    quantity={purchase.quantity}
                    fullName={purchase.fullName}
                    orderId={purchase.orderId}
                    ticketNumber={purchase.ticketNumber}
                    />
                </div>
                ))}
            </div>
            {purchasedTickets.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-24 text-center">
                    <p className="text-muted-foreground">Vous n'avez aucun billet pour le moment.</p>
                </div>
                )}
        </>
      )}
    </div>
  );
}
