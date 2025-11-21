
'use client';
import Image from 'next/image';
import {
  Calendar as CalendarIcon,
  MapPin,
  Search,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categories } from '@/lib/data';
import EventCard from '@/components/event-card';
import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Event } from '@/lib/types';

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-1');
  const { areServicesAvailable, firestore } = useFirebase();

  const eventsQuery = useMemoFirebase(
    () => (areServicesAvailable ? query(collection(firestore, 'events')) : null),
    [areServicesAvailable, firestore]
  );
  const { data: events, isLoading } = useCollection<Event>(eventsQuery);

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1">
        <section className="relative h-[50vh] w-full text-white">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover"
              priority
              data-ai-hint={heroImage.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center space-y-6 px-4 text-center">
            <h1 className="font-headline text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Leader de la billetterie en Afrique de l'ouest
            </h1>
            <p className="max-w-3xl text-lg md:text-xl">
              Découvrez et réservez les meilleurs événements en Côte d'Ivoire.
            </p>
            <Button size="lg" asChild>
                <Link href="#events">
                    Explorer les Événements
                </Link>
            </Button>
          </div>
        </section>

        <div className="relative z-10 bg-background">
          <div className="container mx-auto -mt-12 px-4">
            <div className="rounded-lg border bg-card p-4 shadow-lg md:p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Rechercher un événement..." className="pl-10" />
                </div>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Lieu" className="pl-10" />
                </div>
                <div className="relative">
                   <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                   <Input type="date" placeholder="Date" className="pl-10" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <section id="events" className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 font-headline text-3xl font-bold tracking-tight">
              Événements à la Une
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {isLoading && Array.from({ length: 4 }).map((_, i) => <EventCard.Skeleton key={i} />)}
              {events?.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
             {events && events.length === 0 && !isLoading && (
              <div className="col-span-full flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">Aucun événement trouvé.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
