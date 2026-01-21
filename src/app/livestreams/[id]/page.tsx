'use client';

import { useParams, notFound } from 'next/navigation';
import { useMemo } from 'react';
import { useDoc, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Livestream } from '@/lib/types';
import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, Radio, Calendar, Info, Share2, MessageSquare } from 'lucide-react';

function LivestreamPageContent() {
    const params = useParams();
    const id = params.id as string;
    const { areServicesAvailable, firestore } = useFirebase();

    const livestreamRef = useMemo(
        () => (areServicesAvailable && id ? doc(firestore, 'livestreams', id) : null),
        [areServicesAvailable, id, firestore]
    );

    const { data: livestream, isLoading } = useDoc<Livestream>(livestreamRef);

    if (isLoading) {
        return <LivestreamPageSkeleton />;
    }

    if (!livestream) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2">
                    {/* Video Player */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-lg">
                        {livestream.status === 'live' ? (
                             <div className="flex h-full w-full items-center justify-center">
                                <p className="text-white">Lecteur vidéo du direct ici...</p>
                             </div>
                        ) : livestream.status === 'finished' ? (
                            <div className="flex h-full w-full items-center justify-center">
                                <p className="text-white">Ce direct est terminé. Replay bientôt disponible.</p>
                            </div>
                        ) : (
                             <div className="flex h-full w-full items-center justify-center">
                                <p className="text-white">Le direct n'a pas encore commencé.</p>
                            </div>
                        )}
                        <Badge variant={livestream.status === 'live' ? 'destructive' : 'secondary'} className="absolute left-3 top-3">
                           {livestream.status === 'live' && <Radio className="mr-1 h-3 w-3 animate-pulse" />}
                           {livestream.status === 'live' ? 'En Direct' : livestream.status === 'upcoming' ? 'À venir' : 'Terminé'}
                        </Badge>
                    </div>

                    {/* Title and Description */}
                    <div className="mt-6">
                        <h1 className="font-headline text-3xl font-bold md:text-4xl">{livestream.title}</h1>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(livestream.startTime).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</span>
                            </div>
                        </div>
                        <p className="mt-4 text-base text-foreground/80">{livestream.description}</p>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Accéder au direct</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 text-center">
                                <p className="text-sm text-muted-foreground">Prix du billet</p>
                                <p className="text-3xl font-bold">{livestream.ticketPrice.toLocaleString('fr-FR')} FCFA</p>
                            </div>
                            <Button className="w-full" size="lg" disabled={livestream.status === 'finished'}>
                                <Ticket className="mr-2 h-5 w-5" />
                                {livestream.status === 'upcoming' ? 'Acheter mon accès' : 'Accès acheté'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Chat en direct</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mb-2" />
                            <p>Le chat en direct apparaîtra ici.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}


export default function LivestreamPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <MainNav />
            <main className="flex-1 bg-secondary/30">
                <LivestreamPageContent />
            </main>
            <Footer />
        </div>
    );
}

function LivestreamPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Skeleton className="aspect-video w-full rounded-lg" />
                    <div className="mt-6 space-y-4">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-80 w-full rounded-lg" />
                </div>
            </div>
        </div>
    )
}
