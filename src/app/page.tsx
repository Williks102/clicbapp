
'use client';
import {
  useEffect,
  useState,
  useMemo
} from 'react';
import {
  Calendar,
  Ticket,
  Users,
  Search,
  Music,
  Clapperboard,
  Gamepad2,
  Mic,
  Utensils,
  PartyPopper,
  Tag,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import EventCard from '@/components/event-card';
import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';
import Link from 'next/link';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';


const categoryIcons: { [key: string]: React.ElementType } = {
    Music: Music,
    "Art & Culture": Clapperboard,
    "Food & Drink": Utensils,
    Conference: Mic,
    Festival: PartyPopper,
    Tous: Tag
};


export default function Home() {
  const { areServicesAvailable, firestore } = useFirebase();
  const isMobile = useIsMobile();
  const [activeFilter, setActiveFilter] = useState('Tous');

  // 🔍 Log de débogage
  console.log('[Home Page] 🔥 areServicesAvailable:', areServicesAvailable);

  const eventsQuery = useMemo(
    () => (areServicesAvailable ? query(collection(firestore, 'events')) : null),
    [areServicesAvailable, firestore]
  );
  const { data: events, isLoading, error } = useCollection<Event>(eventsQuery);

  // 🔍 Logs de débogage
  console.log('[Home Page] 📊 Events data:', events);
  console.log('[Home Page] ⏳ Is loading:', isLoading);
  console.log('[Home Page] ❌ Error:', error);

  // 🔍 Log pour vérifier les IDs des événements chargés
  useEffect(() => {
    if (events) {
      console.log('📋 Événements chargés:', events.map(e => ({ id: e.id, name: e.name })));
      if (events.length > 0) {
        console.log('✅ Premier événement:', events[0]);
        console.log('🔗 Lien vers le premier événement: /events/' + events[0].id);
      }
    }
  }, [events]);


  const categoryFilters = useMemo(() => {
    if (!events) return [];
    const categoriesWithEvents = new Set(events.map(event => event.category));
    const filters = [{ name: 'Tous', icon: Tag }];
    
    // Use a predefined order or sort them alphabetically
    const sortedCategories = Array.from(categoriesWithEvents).sort();

    sortedCategories.forEach(category => {
      filters.push({
        name: category,
        icon: categoryIcons[category] || Ticket
      });
    });

    return filters;
  }, [events]);


  // Fonction pour vérifier si un événement est futur
  const isUpcomingEvent = (eventDate: string) => {
    const eventDateTime = new Date(eventDate).getTime();
    const now = new Date().getTime();
    return eventDateTime >= now;
  };

  // Filtrer les événements futurs ET par catégorie
  const filteredEvents = useMemo(() => {
    // D'abord filtrer les événements futurs
    const upcomingEvents = events?.filter(event => isUpcomingEvent(event.date));

    // Ensuite filtrer par catégorie
    if (activeFilter === 'Tous') {
      return upcomingEvents;
    }
    return upcomingEvents?.filter(event => event.category === activeFilter);
  }, [events, activeFilter]);


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MainNav />
      <main className="flex-1">
        <section className="relative w-full overflow-hidden bg-background py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <Badge variant="secondary">La billetterie nouvelle génération</Badge>
                <h1 className="font-headline text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                  Achetez et vendez vos billets{' '}
                  <span className="text-primary">en toute simplicité</span>
                </h1>
                <p className="max-w-xl text-lg text-muted-foreground">
                  La plateforme de billetterie la plus complète pour tous vos
                  événements en Côte d'Ivoire.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" asChild>
                    <Link href="/dashboard/events/create">
                      <Ticket className="mr-2 h-5 w-5" />
                      Créer un événement
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/events">
                      <Search className="mr-2 h-5 w-5" />
                      Trouver un événement
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="relative hidden h-full min-h-[300px] items-center justify-center md:flex">
                <div className="relative h-80 w-80">
                  <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10" />
                  <div className="absolute left-[15%] top-[10%] h-40 w-40 rounded-2xl bg-primary/20 p-4 shadow-lg backdrop-blur-sm">
                    <Music className="h-12 w-12 text-primary" />
                    <p className="mt-2 font-bold">Concerts & Shows</p>
                  </div>
                  <div className="absolute bottom-[10%] right-[15%] h-40 w-40 rounded-2xl bg-primary/20 p-4 shadow-lg backdrop-blur-sm">
                    <Mic className="h-12 w-12 text-primary" />
                    <p className="mt-2 font-bold">Conférences</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="events" className="py-12 md:py-16">
           <div className="container mx-auto px-4">
            <div className="mb-8 text-center">
                <h2 className="font-headline text-3xl font-bold tracking-tight">
                Événements à la une
                </h2>
                <p className="text-lg text-muted-foreground">
                Découvrez les événements les plus populaires du moment
                </p>
            </div>

             <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
                {categoryFilters.map(({ name, icon: Icon }) => (
                    <Button
                    key={name}
                    variant={activeFilter === name ? 'default' : 'outline'}
                    onClick={() => setActiveFilter(name)}
                    className={cn(
                        'transition-all',
                        activeFilter === name && 'shadow-md',
                        isMobile ? 'flex-1' : ''
                    )}
                    >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{name}</span>
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <EventCard.Skeleton key={i} />
                ))}
              {filteredEvents?.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {events && filteredEvents?.length === 0 && !isLoading && (
              <div className="col-span-full flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">
                  Aucun événement trouvé dans cette catégorie.
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
