
'use client';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { events, users } from '@/lib/data';
import { useState } from 'react';

type EventStatus = 'approved' | 'pending' | 'rejected';

export default function AdminEventsPage() {
  const [eventStatuses, setEventStatuses] = useState<Record<string, EventStatus>>(() => {
    const initialStatuses: Record<string, EventStatus> = {};
    events.forEach((event, index) => {
      // Make the first event pending for demonstration
      initialStatuses[event.id] = index === 1 ? 'pending' : 'approved';
    });
    return initialStatuses;
  });

  const getOrganizerName = (organizerId: string) => {
    return users.find(o => o.id === organizerId)?.name || 'Inconnu';
  }

  const handleStatusChange = (eventId: string, newStatus: EventStatus) => {
    setEventStatuses(prev => ({...prev, [eventId]: newStatus}));
  }

  const statusConfig: Record<EventStatus, { label: string; className: string }> = {
    approved: { label: 'Approuvé', className: 'border-green-500 bg-green-50 text-green-800' },
    pending: { label: 'En attente', className: 'border-yellow-500 bg-yellow-50 text-yellow-800' },
    rejected: { label: 'Rejeté', className: 'border-red-500 bg-red-50 text-red-800' },
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <PageHeader
          title="Gestion des Événements"
          description="Gérez tous les événements de la plateforme."
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tous les événements</CardTitle>
          <CardDescription>
            Approuvez, modifiez ou supprimez des événements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Événement</TableHead>
                <TableHead>Organisateur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const status = eventStatuses[event.id];
                const config = statusConfig[status];
                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="font-medium">{event.name}</div>
                      <div className="text-sm text-muted-foreground md:hidden">
                        {new Date(event.date).toLocaleDateString('fr-FR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </TableCell>
                    <TableCell>{getOrganizerName(event.organizerId)}</TableCell>
                    <TableCell>
                      <Badge variant={'outline'} className={config.className}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(event.date).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {status === 'pending' && <DropdownMenuItem className='text-green-600 font-semibold' onClick={() => handleStatusChange(event.id, 'approved')}>Approuver</DropdownMenuItem>}
                          <DropdownMenuItem asChild>
                            <Link href={`/events/${event.id}`}>Voir l'événement</Link>
                          </DropdownMenuItem>
                          {status === 'pending' && <DropdownMenuItem className="text-destructive" onClick={() => handleStatusChange(event.id, 'rejected')}>
                            Rejeter
                          </DropdownMenuItem>}
                          <DropdownMenuItem asChild>
                           <Link href={`/dashboard/events/edit/${event.id}`}>Modifier</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
