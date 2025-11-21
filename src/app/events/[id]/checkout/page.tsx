

'use client';

import Link from 'next/link';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { events } from '@/lib/data';
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
import { Suspense } from 'react';

function CheckoutPageComponent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const eventId = pathname.split('/')[2];

  const ticketId = searchParams.get('ticketId');

  const event = events.find((e) => e.id === eventId);
  const ticket = event?.tickets.find((t) => t.id === ticketId);

  if (!event || !ticket) {
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
              <CheckoutForm event={event} ticket={ticket} />
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
    <Suspense fallback={<div>Chargement...</div>}>
      <CheckoutPageComponent />
    </Suspense>
  )
}
