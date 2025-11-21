
'use client';

import Image from 'next/image';
import { notFound, useParams } from 'next/navigation';
import { Globe, Mail } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';
import EventCard from '@/components/event-card';
import { useDoc, useCollection, useFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import type { Organizer, Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

type OrganizerPageProps = {
  params: {
    id: string;
  };
};

export default function OrganizerPage() {
  const params = useParams();
  const { areServicesAvailable, firestore } = useFirebase();

  const organizerRef = useMemo(
    () => (areServicesAvailable ? doc(firestore, 'organizers', params.id as string) : null),
    [areServicesAvailable, firestore, params.id]
  );
  const { data: organizer, isLoading: isOrganizerLoading } = useDoc<Organizer>(organizerRef);

  const eventsQuery = useMemo(
    () => (areServicesAvailable ? query(
      collection(firestore, 'events'),
      where('organizerId', '==', params.id)
    ) : null),
    [areServicesAvailable, firestore, params.id]
  );
  const { data: organizerEvents, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);

  const isLoading = isOrganizerLoading;

  if (!isLoading && !organizer) {
    notFound();
  }

  const avatar = organizer
    ? PlaceHolderImages.find((img) => img.id === organizer.avatar)
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 bg-secondary/50">
        <div className="container mx-auto px-4 py-12">
          {isLoading ? <OrganizerSkeleton /> : (
            organizer && (
              <Card className="overflow-hidden">
                  <div className="bg-card p-6 md:p-8">
                    <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
                      <Avatar className="h-24 w-24 border-4 border-primary md:h-32 md:w-32">
                        {avatar && <AvatarImage src={avatar.imageUrl} alt={organizer.name} data-ai-hint={avatar.imageHint} />}
                        <AvatarFallback className="text-4xl">
                          {organizer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h1 className="font-headline text-3xl font-bold md:text-4xl">
                          {organizer.name}
                        </h1>
                        <p className="mt-2 max-w-2xl text-base text-muted-foreground md:text-lg">
                          {organizer.bio}
                        </p>
                        <div className="mt-4 flex flex-col items-center justify-center space-y-2 text-sm sm:flex-row sm:space-y-0 sm:space-x-4 md:justify-start">
                          <div className="flex items-center text-muted-foreground">
                            <Globe className="mr-2 h-4 w-4" />
                            <span>{organizer.name.replace(/\s/g, '').toLowerCase()}.com</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Mail className="mr-2 h-4 w-4" />
                            <span>contact@{organizer.name.replace(/\s/g, '').toLowerCase()}.com</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              </Card>
            )
          )}

          <section className="mt-12">
            <h2 className="mb-8 font-headline text-3xl font-bold">
              Événements de {organizer?.name || '...'}
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {areEventsLoading && Array.from({length: 3}).map((_, i) => <EventCard.Skeleton key={i} />)}
              {organizerEvents && organizerEvents.length > 0 ? (
                organizerEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))
              ) : (
                !areEventsLoading && (
                  <p className="col-span-full text-muted-foreground">
                    Cet organisateur n'a aucun événement à venir pour le moment.
                  </p>
                )
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function OrganizerSkeleton() {
    return (
        <Card className="overflow-hidden">
            <div className="bg-card p-6 md:p-8">
                <div className="flex flex-col items-center gap-6 md:flex-row">
                    <Skeleton className="h-24 w-24 rounded-full md:h-32 md:w-32" />
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <Skeleton className="mx-auto h-9 w-1/2 md:mx-0" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-4/5" />
                        <div className="mt-4 flex flex-col items-center justify-center gap-4 sm:flex-row md:justify-start">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-40" />
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
}
