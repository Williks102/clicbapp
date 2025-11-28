'use client';

import { useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';
import CheckoutForm from '@/components/checkout-form';
import { useDoc, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Event } from '@/lib/types';

function CheckoutPageComponent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id as string;
  const ticketId = searchParams.get('ticketId');

  const { areServicesAvailable, firestore } = useFirebase();

  // Charger l'événement depuis Firestore
  const eventRef = useMemo(
    () => (areServicesAvailable && eventId ? doc(firestore, `events/${eventId}`) : null),
    [areServicesAvailable, firestore, eventId]
  );
  const { data: event, isLoading, error } = useDoc<Event>(eventRef);

  // ✅ DEBUG: Afficher les infos dans la console
  console.log('🔍 === DEBUG CHECKOUT PAGE ===');
  console.log('eventId:', eventId);
  console.log('ticketId from URL:', ticketId);
  console.log('event loaded:', event);
  if (event) {
    console.log('event.tickets:', event.tickets);
    console.log('Searching for ticket with id:', ticketId);
    event.tickets.forEach((t, index) => {
      console.log(`  Ticket ${index}:`, {
        id: t.id,
        name: t.name,
        matches: t.id === ticketId,
      });
    });
  }
  console.log('isLoading:', isLoading);
  console.log('error:', error);

  // États de chargement
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <MainNav />
        <main className="flex-1 bg-secondary/50 py-12">
          <div className="container mx-auto max-w-3xl px-4">
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ✅ Vérifier seulement l'événement et le ticketId, PAS le ticket
  if (!event || !ticketId || error) {
    console.log('❌ Redirecting to notFound because:');
    console.log('  event exists:', !!event);
    console.log('  ticketId exists:', !!ticketId);
    console.log('  error:', error);
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 bg-secondary/50 py-12">
        <div className="container mx-auto max-w-3xl px-4">
          <Button variant="ghost" asChild className="mb-4">
            <Link href={`/events/${event.id}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Retour à l'événement
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">
                Finaliser votre commande
              </CardTitle>
              <CardDescription>
                Veuillez remplir vos informations pour recevoir votre billet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* ✅ Laisser CheckoutForm gérer la recherche et l'affichage du "billet introuvable" */}
              <CheckoutForm event={event} ticketId={ticketId} />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <CheckoutPageComponent />
    </Suspense>
  );
}