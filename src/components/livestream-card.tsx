import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Radio, Ticket } from 'lucide-react';
import type { Livestream } from '@/lib/types';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type LivestreamCardProps = {
  livestream: Livestream;
};

export function LivestreamCard({ livestream }: LivestreamCardProps) {
  const image = PlaceHolderImages.find((img) => img.id === livestream.coverImage);

  return (
    <Card className="flex h-full transform flex-col overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <Link href={`/livestreams/${livestream.id}`} className="block">
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {image ? (
            <Image
              src={image.imageUrl}
              alt={livestream.title}
              fill
              className="object-cover transition-transform duration-300 hover:scale-105"
              data-ai-hint={image.imageHint}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="h-full w-full bg-secondary" />
          )}
           <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
           <Badge variant={livestream.status === 'live' ? 'destructive' : 'secondary'} className="absolute left-2 top-2">
             {livestream.status === 'live' && <Radio className="mr-1 h-3 w-3 animate-pulse" />}
             {livestream.status === 'live' ? 'En Direct' : 'À venir'}
           </Badge>
        </div>
      </Link>
      <CardContent className="flex flex-1 flex-col p-4">
        <h3 className="mb-2 font-headline text-lg font-semibold leading-tight">
          <Link href={`/livestreams/${livestream.id}`} className="hover:text-primary">
            {livestream.title}
          </Link>
        </h3>
        <div className="mt-auto space-y-3">
            <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4 shrink-0" />
                <span>
                    {new Date(livestream.startTime).toLocaleString('fr-FR', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                    })}
                </span>
            </div>
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center font-semibold">
                    <Ticket className="mr-2 h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Accès: </span>
                    <span className="ml-1 text-base text-foreground">{livestream.ticketPrice.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <Button asChild size="sm">
                    <Link href={`/livestreams/${livestream.id}`}>
                        {livestream.status === 'live' ? 'Regarder' : 'Acheter'}
                    </Link>
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

LivestreamCard.Skeleton = function LivestreamCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Skeleton className="aspect-[16/9] w-full" />
      <CardContent className="flex flex-1 flex-col p-4">
        <Skeleton className="mb-2 h-6 w-3/4" />
        <div className="mt-auto space-y-3">
           <Skeleton className="h-4 w-full" />
           <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-9 w-16" />
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
