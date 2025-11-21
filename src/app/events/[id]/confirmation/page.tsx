
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, notFound } from 'next/navigation';
import { Home } from 'lucide-react';
import { events } from '@/lib/data';
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

function ConfirmationPageComponent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  const ticketId = searchParams.get('ticketId');
  const quantity = searchParams.get('quantity') || '1';
  const fullName = searchParams.get('fullName') || 'Acheteur Anonyme';
  const email = searchParams.get('email') || '';
  const orderId = searchParams.get('orderId');
  const ticketNumber = orderId ? `TKT-${orderId.split('-')[1]}` : 'TKT-DEMO';


  const event = events.find((e) => e.id === eventId);
  const ticket = event?.tickets.find((t) => t.id === ticketId);

  if (!event || !ticket || !orderId) {
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
                        Achat Réussi !
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
    <Suspense fallback={<div>Chargement de la confirmation...</div>}>
      <ConfirmationPageComponent />
    </Suspense>
  );
}
