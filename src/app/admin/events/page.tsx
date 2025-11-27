import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAllEvents } from '@/app/actions/admin-actions';
import Link from 'next/link';
import { DeleteEventButton } from '@/components/admin/delete-event-button';

export default async function AdminEventsPage() {
  // Charger les événements côté serveur
  const events = await getAllEvents();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestion des Événements"
        description={`${events.length} événement${events.length > 1 ? 's' : ''} sur la plateforme.`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Tous les Événements</CardTitle>
          <CardDescription>
            Liste complète des événements créés par tous les organisateurs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                Aucun événement n'a encore été créé.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Événement</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Lieu</TableHead>
                    <TableHead>Organisateur</TableHead>
                    <TableHead>Billets</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const eventDate = new Date(event.date);
                    const isPast = eventDate < new Date();
                    const totalTickets = event.tickets.reduce(
                      (sum, tier) => sum + tier.quantity,
                      0
                    );

                    return (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{event.name}</p>
                            {isPast && (
                              <Badge variant="secondary" className="mt-1">
                                Passé
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(eventDate, 'dd MMM yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {event.location}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {event.organizerId.substring(0, 8)}...
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{totalTickets}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/events/${event.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Voir l'événement
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <DeleteEventButton eventId={event.id} eventName={event.name} />
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}