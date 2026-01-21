'use client';

import { useState, useMemo } from 'react';
import { Video } from 'lucide-react';
import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';
import { PageHeader } from '@/components/page-header';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Livestream } from '@/lib/types';
import { LivestreamCard } from '@/components/livestream-card';

export default function LivestreamsPage() {
  const { areServicesAvailable, firestore } = useFirebase();

  const livestreamsQuery = useMemo(
    () => (areServicesAvailable ? query(collection(firestore, 'livestreams'), where('status', '!=', 'finished')) : null),
    [areServicesAvailable, firestore]
  );
  const { data: livestreams, isLoading, error } = useCollection<Livestream>(livestreamsQuery);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MainNav />
      <main className="flex-1">
        <section className="py-12 md:py-16">
           <div className="container mx-auto px-4">
            <PageHeader
                title="Événements en Direct"
                description="Regardez des concerts, interviews, et plus, en live."
                className="mb-8 text-center"
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <LivestreamCard.Skeleton key={i} />
                ))}
              {livestreams?.map((livestream) => (
                <LivestreamCard key={livestream.id} livestream={livestream} />
              ))}
            </div>
            {livestreams && livestreams?.length === 0 && !isLoading && (
              <div className="col-span-full flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                <Video className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  Aucun événement en direct n'est prévu pour le moment.
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
