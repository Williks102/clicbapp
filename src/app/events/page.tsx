
'use client';

import { useState, useMemo } from 'react';
import {
  Music,
  Clapperboard,
  Gamepad2,
  Mic,
  Utensils,
  PartyPopper,
  Tag,
  Ticket,
} from 'lucide-react';

import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';
import EventCard from '@/components/event-card';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const categoryIcons: { [key: string]: React.ElementType } = {
    Music: Music,
    "Art & Culture": Clapperboard,
    "Food & Drink": Utensils,
    Conference: Mic,
    Festival: PartyPopper,
    Tous: Tag
};


export default function EventsPage() {
  const { areServicesAvailable, firestore } = useFirebase();
  const isMobile = useIsMobile();
  const [activeFilter, setActiveFilter] = useState('Tous');
  
  // 🔍 Log de débogage
  console.log('[Events Page] 🔥 areServicesAvailable:', areServicesAvailable);

  const eventsQuery = useMemo(
    () => (areServicesAvailable ? query(collection(firestore, 'events')) : null),
    [areServicesAvailable, firestore]
  );
  const { data: events, isLoading, error } = useCollection<Event>(eventsQuery);

  // 🔍 Logs de débogage
  console.log('[Events Page] 📊 Events data:', events);
  console.log('[Events Page] ⏳ Is loading:', isLoading);
  console.log('[Events Page] ❌ Error:', error);


  const categoryFilters = useMemo(() => {
    if (!events) return [];
    const categoriesWithEvents = new Set(events.map(event => event.category));
    const filters = [{ name: 'Tous', icon: Tag }];
    
    const sortedCategories = Array.from(categoriesWithEvents).sort();

    sortedCategories.forEach(category => {
      filters.push({
        name: category,
        icon: categoryIcons[category] || Ticket
      });
    });

    return filters;
  }, [events]);


  const filteredEvents =
    activeFilter === 'Tous'
      ? events
      : events?.filter(
          (event) => event.category === activeFilter
        );


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MainNav />
      <main className="flex-1">
        <section className="py-12 md:py-16">
           <div className="container mx-auto px-4">
            <PageHeader
                title="Tous les événements"
                description="Découvrez les événements les plus populaires du moment"
                className="mb-8 text-center"
            />

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
                Array.from({ length: 6 }).map((_, i) => (
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
