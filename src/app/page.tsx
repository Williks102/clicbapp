
'use client';
import Image from 'next/image';
import {
  Calendar as CalendarIcon,
  MapPin,
  Search,
  Music,
  Mic,
  Clapperboard,
  Gamepad2,
  Users,
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
import { Card } from '@/components/ui/card';

const categoryIcons = {
  Sports: <Gamepad2 className="h-8 w-8 text-primary" />,
  Concerts: <Music className="h-8 w-8 text-primary" />,
  Conferences: <Mic className="h-8 w-8 text-primary" />,
  Theatre: <Clapperboard className="h-8 w-8 text-primary" />,
};

function CategoryCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 p-4 shadow-lg transition-transform hover:-translate-y-1">
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Card>
  );
}

export default function Home() {
  const { areServicesAvailable, firestore } = useFirebase();

  const eventsQuery = useMemoFirebase(
    () => (areServicesAvailable ? query(collection(firestore, 'events')) : null),
    [areServicesAvailable, firestore]
  );
  const { data: events, isLoading } = useCollection<Event>(eventsQuery);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MainNav />
      <main className="flex-1">
        <section className="relative w-full overflow-hidden bg-background py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                  Découvrez les meilleurs <br />
                  <span className="text-primary">événements</span> en Côte
                  d'Ivoire
                </h1>
                <p className="max-w-xl text-lg text-muted-foreground">
                  Concerts, théâtre, sports, conférences... Réservez vos
                  billets en quelques clics sur la plateforme de billetterie #1
                  du pays.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" asChild>
                    <Link href="#events">
                      <CalendarIcon className="mr-2 h-5 w-5" />
                      Voir les événements
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/account">
                      <Users className="mr-2 h-5 w-5" />
                      S'inscrire
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="relative hidden h-full min-h-[300px] items-center justify-center md:flex">
                 <div className="absolute left-1/2 top-1/2 h-48 w-80 -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-primary/10 shadow-inner">
                   <div className="absolute left-[-2rem] top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-background" />
                   <div className="absolute right-[-2rem] top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-background" />
                 </div>
                 <div className="relative z-10 grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                       <CategoryCard icon={categoryIcons.Sports} label="Sports" />
                       <CategoryCard icon={categoryIcons.Concerts} label="Concerts" />
                    </div>
                    <div className="mt-8 space-y-4">
                       <CategoryCard icon={categoryIcons.Conferences} label="Conférences" />
                       <CategoryCard icon={categoryIcons.Theatre} label="Théâtre" />
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        <section id="events" className="py-12 md:py-16 bg-secondary/20">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 font-headline text-3xl font-bold tracking-tight">
              Événements à la Une
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <EventCard.Skeleton key={i} />
                ))}
              {events?.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {events && events.length === 0 && !isLoading && (
              <div className="col-span-full flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">
                  Aucun événement trouvé.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
