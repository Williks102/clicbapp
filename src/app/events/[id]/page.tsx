

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Ticket, Video } from 'lucide-react';
import { notFound, useRouter, useParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

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
import {CheckoutForm} from '@/components/checkout-form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDoc, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueue } from '@/hooks/use-queue';
import { QueueWaitingRoom } from '@/components/queue-waiting-room';
import { getQueueConfig } from '@/app/actions/queue-actions';


export default function EventPage() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const params = useParams();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketTier | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [queueConfigEnabled, setQueueConfigEnabled] = useState(false);
  const id = params.id as string;

  const { areServicesAvailable, firestore } = useFirebase();

  // ✅ FIX: Don't include firestore in deps as it's a stable reference
  // Only include areServicesAvailable and id which are primitives
  const eventRef = useMemo(
    () => (areServicesAvailable && id ? doc(firestore, `events/${id}`) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [areServicesAvailable, id]
  );
  const { data: event, isLoading: isEventLoading, error: eventError } = useDoc<Event>(eventRef);

  // ✅ FIX: Use event?.organizerId instead of entire event object to avoid re-renders
  // Only depend on the organizerId string, not the whole event object
  const organizerRef = useMemo(
    () => (areServicesAvailable && event?.organizerId ? doc(firestore, `organizers/${event.organizerId}`) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [areServicesAvailable, event?.organizerId]
  );
  const { data: organizer, isLoading: isOrganizerLoading } = useDoc<Organizer>(organizerRef);

  // Gestion de la file d'attente
  const { queueState, isLoading: isQueueLoading, joinQueue, leaveQueue } = useQueue(
    id,
    selectedTicket?.id || ''
  );

  const isLoading = isEventLoading;

  useEffect(() => {
    if (!isEventLoading && !event && areServicesAvailable) {
      notFound();
    }
  }, [isEventLoading, event, areServicesAvailable]);

  const organizerAvatar = organizer ? PlaceHolderImages.find(
    (img) => img.id === organizer.avatar
  ) : null;

  // Charger la configuration de la queue au chargement de la page
  useEffect(() => {
    if (event?.id) {
      getQueueConfig(event.id).then(config => {
        setQueueConfigEnabled(config?.enabled ?? false);
      });
    }
  }, [event?.id]);

  const handleBuyClick = async (ticket: TicketTier) => {
    if (!event) return;
    setSelectedTicket(ticket);

    // Approche hybride: Configuration Firebase + activation automatique intelligente
    let shouldUseQueue = false;

    // 1. Si l'organisateur a activé manuellement la queue
    if (queueConfigEnabled) {
      shouldUseQueue = true;
    }
    // 2. Sinon, activation automatique basée sur la demande
    else {
      // Activer si moins de 20 billets restants
      shouldUseQueue = ticket.quantity < 20;
    }

    if (shouldUseQueue) {
      setShowQueue(true);
      await joinQueue();
    } else {
      if (isMobile) {
        setIsSheetOpen(true);
      } else {
        router.push(`/events/${event.id}/checkout?ticketId=${ticket.id}`);
      }
    }
  };

  const handleQueueCancel = async () => {
    await leaveQueue();
    setShowQueue(false);
    setSelectedTicket(null);
  };

  const handleQueueProceed = () => {
    if (!event) return;
    setShowQueue(false);
    if (isMobile) {
      setIsSheetOpen(true);
    } else {
      router.push(`/events/${event.id}/checkout?ticketId=${selectedTicket?.id}`);
    }
  };

  // Gérer l'activation automatique du checkout quand l'utilisateur devient actif
  useEffect(() => {
    if (queueState?.status === 'active' && showQueue) {
      handleQueueProceed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueState?.status, showQueue]);

  const image = event 
    ? event.image.startsWith('http')
      ? { imageUrl: event.image, imageHint: 'event image' }
      : PlaceHolderImages.find((img) => img.id === event.image)
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />

      {/* Salle d'attente virtuelle */}
      {showQueue && queueState && (
        <QueueWaitingRoom
          queueState={queueState}
          onCancel={handleQueueCancel}
          onProceed={handleQueueProceed}
        />
      )}

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

                 {event.livestream?.enabled && (
                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-headline">
                        <Video className="h-6 w-6" /> Accès au Direct
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {event.livestream.isLive && event.livestream.watchUrl ? (
                         <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="relative flex h-3 w-3">
                                    <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></div>
                                    <div className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></div>
                                </div>
                                <span className="font-semibold text-red-600">EN DIRECT MAINTENANT</span>
                            </div>
                            <Button asChild className="w-full">
                                <Link href={event.livestream.watchUrl} target="_blank" rel="noopener noreferrer">
                                    Regarder le direct
                                </Link>
                            </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Cet événement sera diffusé en direct. Achetez votre accès pour le regarder en ligne.
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <p className="font-semibold">{event.livestream.title}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-bold">
                            {event.livestream.ticketPrice.toLocaleString('fr-FR')} FCFA
                          </p>
                          <Button disabled>
                            Acheter l'accès
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
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
                  ticketId={selectedTicket.id}
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
