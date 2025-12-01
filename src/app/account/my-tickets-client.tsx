'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PageHeader } from '@/components/page-header';
import ElectronicTicket from '@/components/electronic-ticket';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, TicketIcon } from 'lucide-react';
import { getUserTickets, type EnrichedTicket } from '@/app/actions/account-actions';

// Composant pour afficher un billet
function TicketCard({ ticket }: { ticket: EnrichedTicket }) {
  const { sale, event, ticketTier, ticketNumber } = ticket;

  // Cas où l'événement n'existe plus
  if (!event) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="font-semibold text-destructive">Événement introuvable</p>
        <p className="mt-2 text-sm text-muted-foreground">
          L&apos;événement associé à cette commande (ID: {sale.eventId}) n&apos;existe plus.
        </p>
      </div>
    );
  }

  // Cas où le type de billet n'existe plus
  if (!ticketTier) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="font-semibold text-destructive">Type de billet introuvable</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pour l&apos;événement: {event.name}
        </p>
      </div>
    );
  }

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

// Composant principal
export default function MyTicketsClient() {
  const router = useRouter();
  const { status } = useSession();
  const [tickets, setTickets] = useState<EnrichedTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [initialLoading, setInitialLoading] = useState(true);

  // Redirection si non authentifié
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Charger les billets au montage
  useEffect(() => {
    if (status === 'authenticated') {
      loadTickets();
    }
  }, [status]);

  async function loadTickets() {
    startTransition(async () => {
      const result = await getUserTickets();
      
      if (result.success && result.tickets) {
        setTickets(result.tickets);
        setError(null);
      } else {
        setError(result.error || 'Erreur inconnue');
      }
      
      setInitialLoading(false);
    });
  }

  // État de chargement initial
  if (status === 'loading' || initialLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Mes Billets"
          description="Chargement de vos billets..."
        />
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Non authentifié (en attente de redirection)
  if (status !== 'authenticated') {
    return null;
  }

  // Erreur
  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Mes Billets"
          description="Une erreur est survenue."
        />
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <p className="text-lg font-medium text-destructive">
            Impossible de charger vos billets
          </p>
          <p className="mt-2 text-sm text-destructive/80">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={loadTickets}
            disabled={isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  // Rendu principal
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Mes Billets"
          description="Retrouvez ici tous les billets pour vos événements à venir."
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={loadTickets}
          disabled={isPending}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <TicketIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">Aucun billet pour le moment</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Parcourez nos événements et achetez vos premiers billets !
          </p>
          <Button className="mt-6" onClick={() => router.push('/events')}>
            Découvrir les événements
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.sale.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}