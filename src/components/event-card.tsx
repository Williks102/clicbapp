

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import type { Event } from '@/lib/types';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type EventCardProps = {
  event: Event;
};

export default function EventCard({ event }: EventCardProps) {
  const minPrice = event.tickets.length > 0 ? Math.min(...event.tickets.map(t => t.price)) : 0;
  
  const isExternalImage = event.image.startsWith('http');
  const image = isExternalImage ? { imageUrl: event.image, imageHint: 'event image' } : PlaceHolderImages.find((img) => img.id === event.image);

  return (
    <Card className="flex h-full transform flex-col overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <Link href={`/events/${event.id}`} className="block">
        <div className="relative h-56 w-full">
          {image ? (
            <Image
              src={image.imageUrl}
              alt={event.name}
              fill
              className="object-cover"
              data-ai-hint={image.imageHint}
            />
          ) : (
            <div className="h-full w-full bg-secondary" />
          )}
           <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
           <Badge variant="secondary" className="absolute left-2 top-2">{event.category}</Badge>
        </div>
      </Link>
      <CardContent className="flex flex-1 flex-col p-4">
        <h3 className="mb-2 font-headline text-lg font-semibold leading-tight">
          <Link href={`/events/${event.id}`} className="hover:text-primary">
            {event.name}
          </Link>
        </h3>
        <div className="mt-auto space-y-3">
            <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4 shrink-0" />
                <span>
                    {new Date(event.date).toLocaleDateString('fr-FR', {
                    month: 'long',
                    day: 'numeric',
                    })}
                    , {new Date(event.date).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }).replace(':', 'h')}
                </span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{event.location}</span>
            </div>
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center font-semibold">
                    <Ticket className="mr-2 h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">À partir de </span>
                    <span className="ml-1 text-base text-foreground">{minPrice.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <Button asChild size="sm" variant="outline">
                    <Link href={`/events/${event.id}`}>Voir</Link>
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

EventCard.Skeleton = function EventCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Skeleton className="h-56 w-full" />
      <CardContent className="flex flex-1 flex-col p-4">
        <Skeleton className="mb-2 h-6 w-3/4" />
        <div className="mt-auto space-y-3">
           <Skeleton className="h-4 w-full" />
           <Skeleton className="h-4 w-2/3" />
           <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-9 w-16" />
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
