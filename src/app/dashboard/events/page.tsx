
'use client';

import Link from 'next/link';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
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
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { useSession } from 'next-auth/react';

export default function MyEventsPage() {
  const { data: session, status } = useSession();
  const isUserLoading = status === 'loading';
  const firestore = useFirestore();

  const myEventsQuery = useMemo(
    () => (firestore && session?.user?.id ? query(collection(firestore, 'events'), where('organizerId', '==', session.user.id)) : null),
    [firestore, session]
  );
  const { data: myEvents, isLoading: areEventsLoading } = useCollection<Event>(myEventsQuery);

  const isLoading = isUserLoading || areEventsLoading;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Mes Événements"
          description="Gérez vos événements créés."
        />
        <Button asChild>
          <Link href="/dashboard/events/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer un Événement
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Liste des événements</CardTitle>
          <CardDescription>
            Retrouvez ici tous les événements que vous avez créés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Événement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  <TableRow>
                    <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                  </TableRow>
                </>
              )}
              {!isLoading && myEvents?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Vous n'avez créé aucun événement pour le moment.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && myEvents?.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>
                    <Badge variant={new Date(event.date) > new Date() ? 'default' : 'outline'} className={new Date(event.date) > new Date() ? 'bg-green-500 text-white' : ''}>
                      {new Date(event.date) > new Date()
                        ? 'À venir'
                        : 'Passé'}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
                        <DropdownMenuItem asChild>
                        <Link href={`/dashboard/events/edit/${event.id}`}>Modifier</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link href={`/events/${event.id}`}>Voir</Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem className="text-destructive">
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
