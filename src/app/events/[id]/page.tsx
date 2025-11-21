'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { notFound, useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';
import { TicketTier, Organizer, Event } from '@/lib/types';
import CheckoutForm from '@/components/checkout-form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';


export default function EventPage() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const params = useParams();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketTier | null>(null);
  const id = params.id as string;

  const { areServicesAvailable, firestore } = useFirebase();

  // 🔍 Log de débogage
  console.log('[Event Page] 🔥 areServicesAvailable:', areServicesAvailable);
  console.log('[Event Page] 📋 Event ID:', id);

  const eventRef = useMemoFirebase(
    () => (areServicesAvailable && id ? doc(firestore, `events/${id}`) : null),
    [areServicesAvailable, firestore, id]
  );
  const { data: event, isLoading: isEventLoading, error: eventError } = useDoc<Event>(eventRef);
  
  // 🔍 Log de débogage pour l'événement
  console.log('[Event Page] 📊 Event data:', event);
  console.log('[Event Page] ⏳ Event loading:', isEventLoading);
  console.log('[Event Page] ❌ Event error:', eventError);
  
  const organizerRef = useMemoFirebase(
    () => (areServicesAvailable && event ? doc(firestore, `organizers/${event.organizerId}`) : null),
    [areServicesAvailable, firestore, event]
  );
  const { data: organizer, isLoading: isOrganizerLoading } = useDoc<Organizer>(organizerRef);
  
  // 🔍 Log de débogage pour l'organisateur
  console.log('[Event Page] 👤 Organizer data:', organizer);
  console.log('[Event Page] ⏳ Organizer loading:', isOrganizerLoading);
  
  // ✅ CORRECTION: Ne considérer isLoading que pour l'événement principal
  // L'organisateur peut charger après sans bloquer l'affichage
  const isLoading = !areServicesAvailable || isEventLoading;

  // ✅ CORRECTION: Vérifier explicitement si le document n'existe pas
  useEffect(() => {
    if (!isEventLoading && !event && areServicesAvailable) {
      console.log('[Event Page] ⚠️ Event not found, calling notFound()');
      notFound();
    }
  }, [isEventLoading, event, areServicesAvailable]);

  const image = event ? PlaceHolderImages.find((img) => img.id === event.image) : null;
  const organizerAvatar = organizer ? PlaceHolderImages.find(
    (img) => img.id === organizer.avatar
  ) : null;

  const handleBuyClick = (ticket: TicketTier) => {
    if (!event) return;
    setSelectedTicket(ticket);
    if (isMobile) {
      setIsSheetOpen(true);
    } else {
      router.push(`/events/${event.id}/checkout?ticketId=${ticket.id}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      {isLoading ? (
         <EventPageSkeleton />
      ) : event && (
        <main className="flex-1">
        <section className="relative h-[40vh] w-full bg-secondary">
          {image && (
            <Image
              src={image.imageUrl}
              alt={event.name}
              fill
              className="object-cover"
              data-ai-hint={image.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        </section>

        <div className="container mx-auto -mt-24 px-4 pb-16">
          <div className="relative z-10">
            <div className="mb-8">
              <Badge variant="secondary" className="mb-2 text-base">
                {event.category}
              </Badge>
              <h1 className="font-headline text-4xl font-extrabold tracking-tight md:text-5xl">
                {event.name}
              </h1>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">
                      À Propos de l'Événement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 text-base text-foreground/80">
                    <p>{event.description}</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex items-center">
                        <Calendar className="mr-3 h-5 w-5 text-primary" />
                        <span>
                          {new Date(event.date).toLocaleString('fr-FR', {
                            dateStyle: 'full',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="mr-3 h-5 w-5 text-primary" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {organizer && (
                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle className="font-headline">
                        Organisateur
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          {organizerAvatar && (
                            <AvatarImage
                              src={organizerAvatar.imageUrl}
                              alt={organizer.name}
                              data-ai-hint={organizerAvatar.imageHint}
                            />
                          )}
                          <AvatarFallback>
                            {organizer.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link
                            href={`/organizers/${organizer.id}`}
                            className="font-bold hover:underline"
                          >
                            {organizer.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {organizer.bio}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline">
                      <Ticket className="h-6 w-6" /> Acheter des Billets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {event.tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-semibold">{ticket.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {ticket.quantity > 0
                              ? `${ticket.quantity} disponibles`
                              : 'Épuisé'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-bold">
                            {ticket.price.toLocaleString('fr-FR')} FCFA
                          </p>
                          <Button
                            onClick={() => handleBuyClick(ticket)}
                            disabled={ticket.quantity === 0}
                          >
                            Acheter
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Checkout Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>Finaliser l'achat</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(90vh-80px)] pr-4">
              {selectedTicket && event && (
                <CheckoutForm 
                  event={event} 
                  ticket={selectedTicket}
                />
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </main>
      )}
      <Footer />
    </div>
  );
}

function EventPageSkeleton() {
  return (
    <main className="flex-1">
      <section className="relative h-[40vh] w-full bg-secondary">
        <Skeleton className="h-full w-full" />
      </section>
      <div className="container mx-auto -mt-24 px-4 pb-16">
        <div className="relative z-10">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-12 w-3/4" />
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-2/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
