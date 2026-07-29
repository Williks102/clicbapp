'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CalendarClock, PlayCircle, Radio } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { DataError } from '@/components/data-error';
import { useRealtimeQuery } from '@/hooks/use-realtime-query';
import { toCompetition } from '@/lib/supabase/mappers';
import { COMPETITION_COLUMNS, type CompetitionRow } from '@/lib/supabase/types';
import { PUBLIC_COMPETITION_STATUSES } from '@/lib/live-utils';
import { formatFCFA } from '@/lib/utils';
import type { Competition } from '@/lib/types';

const FALLBACK_IMAGE = 'https://placehold.co/800x450/0f172a/ffffff?text=Direct';

export default function LivePage() {
  const { data: competitions, isLoading, error } = useRealtimeQuery<
    CompetitionRow,
    Competition
  >({
    table: 'competitions',
    select: COMPETITION_COLUMNS,
    inFilter: { column: 'status', values: PUBLIC_COMPETITION_STATUSES },
    orderBy: { column: 'created_at', ascending: false },
    map: toCompetition,
  });

  const broadcasts = useMemo(() => {
    const withLive = (competitions ?? []).filter((c) => c.live?.enabled);

    // Les directs en cours passent devant, puis les diffusions programmées.
    return withLive.sort((a, b) => {
      if (a.live.isLive !== b.live.isLive) return a.live.isLive ? -1 : 1;
      const aTime = a.live.scheduledAt ? new Date(a.live.scheduledAt).getTime() : 0;
      const bTime = b.live.scheduledAt ? new Date(b.live.scheduledAt).getTime() : 0;
      return aTime - bTime;
    });
  }, [competitions]);

  const liveCount = broadcasts.filter((c) => c.live.isLive).length;

  return (
    <div className="container mx-auto px-4 py-10">
      <PageHeader
        title="Diffusions en direct"
        description={
          liveCount > 0
            ? `${liveCount} diffusion${liveCount > 1 ? 's' : ''} en cours actuellement.`
            : 'Retrouvez ici les prochaines diffusions et les rediffusions disponibles.'
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}

        {broadcasts.map((competition) => (
          <Card key={competition.id} className="group overflow-hidden">
            <Link href={`/competitions/${competition.id}/live`} className="block">
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                <Image
                  src={competition.coverImage || FALLBACK_IMAGE}
                  alt={competition.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute left-3 top-3">
                  {competition.live.isLive ? (
                    <Badge className="gap-1.5 bg-red-600 text-white hover:bg-red-600">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                      EN DIRECT
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1.5">
                      <Radio className="h-3 w-3" />
                      {competition.live.replayUrl ? 'Rediffusion' : 'À venir'}
                    </Badge>
                  )}
                </div>
                <PlayCircle className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white/90 transition-transform group-hover:scale-110" />
              </div>
            </Link>

            <CardContent className="space-y-1 p-4">
              <h3 className="font-headline line-clamp-2 text-lg font-bold">
                {competition.live.title || competition.title}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                {competition.title}
              </p>
              {competition.live.scheduledAt && !competition.live.isLive && (
                <p className="flex items-center gap-1.5 pt-1 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  {new Date(competition.live.scheduledAt).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t p-4">
              <span className="text-sm font-medium">
                {competition.live.paid && competition.live.price > 0
                  ? formatFCFA(competition.live.price)
                  : 'Accès libre'}
              </span>
              <Button size="sm" asChild>
                <Link href={`/competitions/${competition.id}/live`}>
                  {competition.live.isLive ? 'Regarder' : 'Voir la page'}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <DataError error={error} subject="les diffusions" className="mt-8" />

      {!isLoading && !error && broadcasts.length === 0 && (
        <div className="mt-8 flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed">
          <p className="text-muted-foreground">
            Aucune diffusion programmée pour le moment.
          </p>
        </div>
      )}
    </div>
  );
}
