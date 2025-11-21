import { PageHeader } from '@/components/page-header';
import { events, sales } from '@/lib/data';
import ElectronicTicket from '@/components/electronic-ticket';

export default function MyTicketsPage() {
  // Faking purchased tickets for 'usr-1' for demonstration
  const userId = 'usr-1';
  const user = { email: 'aisha.kone@example.com', name: 'Aisha Koné' }; // Static user data

  const purchasedTickets = sales
    .filter(sale => sale.customerEmail === user.email) // A simple way to link sales for demo
    .map(sale => {
      const event = events.find(e => e.id === sale.eventId);
      const ticket = event?.tickets.find(t => t.id === sale.ticketId);
      if (!event || !ticket) return null;
      return { 
        event, 
        ticket, 
        quantity: sale.quantity, 
        fullName: sale.customerName,
        orderId: sale.id,
        ticketNumber: `TKT-${sale.id.split('-')[1]}`
      };
    })
    .filter(Boolean);


  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes Billets"
        description="Retrouvez ici tous les billets pour vos événements à venir."
      />
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
    </div>
  );
}
