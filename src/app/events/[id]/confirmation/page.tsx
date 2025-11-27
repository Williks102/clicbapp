'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, notFound, useParams } from 'next/navigation';
import { Home, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';
import ElectronicTicket from '@/components/electronic-ticket';
import { useDoc, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Event } from '@/lib/types';

function ConfirmationPageComponent() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  // L'eventId peut venir soit de l'URL params, soit des query params (compatibilité)
  const eventIdFromParams = params.id as string;
  const eventIdFromQuery = searchParams.get('eventId');
  const eventId = eventIdFromParams || eventIdFromQuery;
  
  const ticketId = searchParams.get('ticketId');
  const quantity = searchParams.get('quantity') || '1';
  const fullName = searchParams.get('fullName') || 'Acheteur Anonyme';
  const email = searchParams.get('email') || '';
  const orderId = searchParams.get('orderId');
  const ticketNumber = orderId ? `TKT-${orderId.split('-')[1]}` : 'TKT-DEMO';

  const { areServicesAvailable, firestore } = useFirebase();

  // Charger l'événement depuis Firestore
  const eventRef = useMemo(
    () => (areServicesAvailable && eventId ? doc(firestore, `events/${eventId}`) : null),
    [areServicesAvailable, firestore, eventId]
  );
  const { data: event, isLoading, error } = useDoc<Event>(eventRef);

  // Trouver le ticket
  const ticket = event?.tickets.find((t) => t.id === ticketId);

  // État de chargement
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <MainNav />
        <main className="flex-1 bg-secondary/50 py-12">
          <div className="container mx-auto max-w-2xl px-4">
            <Card className="shadow-lg">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Génération de votre billet...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Vérification des données
  if (!event || !ticket || !orderId || error) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 bg-secondary/50 py-12">
        <div className="container mx-auto max-w-2xl px-4">
            <Card className="shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-3xl">
                        Achat Réussi ! 🎉
                    </CardTitle>
                    <CardDescription>
                        Votre billet électronique a été généré. Une copie a été envoyée à {email}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-2 sm:px-6">
                    <ElectronicTicket 
                        event={event} 
                        ticket={ticket} 
                        quantity={parseInt(quantity, 10)}
                        fullName={fullName}
                        orderId={orderId}
                        ticketNumber={ticketNumber}
                    />
                    <div className='text-center'>
                        <Button size="lg" variant="outline" asChild>
                            <Link href="/">
                            <Home className="mr-2 h-5 w-5" />
                            Retour à l'accueil
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <MainNav />
        <main className="flex-1 bg-secondary/50 py-12">
          <div className="container mx-auto max-w-2xl px-4">
            <Card className="shadow-lg">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Chargement de la confirmation...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <ConfirmationPageComponent />
    </Suspense>
  );
}