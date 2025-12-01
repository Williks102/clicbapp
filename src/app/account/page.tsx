
'use client';

import { PageHeader } from '@/components/page-header';
import ElectronicTicket from '@/components/electronic-ticket';
import { useSession } from 'next-auth/react';
import { useCollection, useDoc, useFirebase } from '@/firebase';
import { useMemo, useEffect } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Sale, Event, TicketTier } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

// Component pour afficher un seul billet enrichi
function PurchasedTicket({ sale }: { sale: Sale }) {
  const { firestore, areServicesAvailable } = useFirebase();
  
  // Récupérer l'événement associé à cette vente
  const eventRef = useMemo(() => {
    if (!areServicesAvailable) return null;
    return doc(firestore, 'events', sale.eventId);
  }, [firestore, sale.eventId, areServicesAvailable]);

  const { data: event, isLoading } = useDoc<Event>(eventRef);

  if (isLoading || !areServicesAvailable) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!event) {
    // Gérer le cas où l'événement n'est pas trouvé (supprimé, etc.)
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="font-semibold text-destructive">Événement introuvable</p>
        <p className="text-sm text-muted-foreground mt-2">
          L'événement associé à cette commande (ID: {sale.eventId}) n'existe plus.
        </p>
      </div>
    );
  }

  const ticketTier = event.tickets.find(t => t.id === sale.ticketId);

  if (!ticketTier) {
    // Gérer le cas où le type de billet a été supprimé de l'événement
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="font-semibold text-destructive">Type de billet introuvable</p>
        <p className="text-sm text-muted-foreground mt-2">
          Pour l'événement: {event.name}
        </p>
      </div>
    );
  }

  const ticketNumber = `TKT-${sale.id.split('-')[1] || sale.id.substring(0, 8)}`;

  return (
    <ElectronicTicket
      event={event}
      ticket={ticketTier}
      quantity={sale.quantity}
      fullName={sale.customerName}
      orderId={sale.id}
      ticketNumber={ticketNumber}
    />
  );
}


export default function MyTicketsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { firestore, areServicesAvailable } = useFirebase();

  // Redirection si pas authentifié (côté client pour éviter les flashs)
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Construire la requête pour les ventes de l'utilisateur
  const userSalesQuery = useMemo(() => {
    if (status !== 'authenticated' || !areServicesAvailable || !session?.user?.email) {
      return null;
    }
    return query(
      collection(firestore, 'sales'),
      where('customerEmail', '==', session.user.email)
    );
  }, [status, areServicesAvailable, firestore, session?.user?.email]);

  // Hook pour récupérer les ventes
  const { data: sales, isLoading: isLoadingSales, error: salesError } = useCollection<Sale>(userSalesQuery);
  
  const isLoading = status === 'loading' || !areServicesAvailable || isLoadingSales;

  // Affichage des états de chargement
  if (status === 'loading' || !areServicesAvailable) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Mes Billets"
          description="Chargement de vos billets..."
        />
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      </div>
    );
  }
  
  // Attendre la fin de l'authentification avant de rendre quoi que ce soit
  if (status !== 'authenticated') {
    return null; // Le useEffect se chargera de la redirection
  }
  
  // Affichage en cas d'erreur (ex: permission refusée)
  if (salesError) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Mes Billets"
          description="Une erreur est survenue."
        />
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
            <p className="text-lg font-medium text-destructive">Impossible de charger vos billets</p>
            <p className="text-sm text-destructive/80 mt-2">
                Veuillez réessayer plus tard ou contacter le support.
            </p>
        </div>
      </div>
    );
  }

  // Affichage pendant le chargement des ventes
  if (isLoading) {
      return (
      <div className="space-y-8">
        <PageHeader
          title="Mes Billets"
          description="Chargement de vos billets..."
        />
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      </div>
    );
  }

  // Rendu final
  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes Billets"
        description="Retrouvez ici tous les billets pour vos événements à venir."
      />
      {sales && sales.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg font-medium">Aucun billet pour le moment</p>
          <p className="text-sm text-muted-foreground mt-2">
            Parcourez nos événements et achetez vos premiers billets !
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {sales?.map((sale) => (
            <PurchasedTicket key={sale.id} sale={sale} />
          ))}
        </div>
      )}
    </div>
  );
}
