import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import type { Event } from '@/lib/types';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

type EventCardProps = {
  event: Event;
};

export default function EventCard({ event }: EventCardProps) {
  const image = PlaceHolderImages.find((img) => img.id === event.image);

  return (
    <Card className="flex h-full transform flex-col overflow-hidden shadow-md transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl">
      <CardHeader className="relative h-48 w-full p-0">
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
        <div className="absolute right-2 top-2">
          <Badge variant="secondary">{event.category}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-4">
        <h3 className="mb-2 font-headline text-lg font-semibold leading-tight">
          <Link href={`/events/${event.id}`} className="hover:text-primary">
            {event.name}
          </Link>
        </h3>
        <div className="mb-4 flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          <span>
            {new Date(event.date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="mr-2 h-4 w-4" />
          <span>{event.location}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/events/${event.id}`}>
            Voir les détails <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

EventCard.Skeleton = function EventCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="relative h-48 w-full p-0">
        <Skeleton className="h-full w-full" />
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <Skeleton className="mb-2 h-6 w-3/4" />
        <Skeleton className="mb-4 h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
};
