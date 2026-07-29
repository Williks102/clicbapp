import Image from 'next/image';
import Link from 'next/link';
import { CalendarClock, Radio, Users, Vote as VoteIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { COMPETITION_STATUS_LABELS } from '@/lib/live-utils';
import { cn, formatVotes } from '@/lib/utils';
import type { Competition } from '@/lib/types';

const FALLBACK_IMAGE = 'https://placehold.co/800x450/1f2937/ffffff?text=ClicVote';

type CompetitionCardProps = {
  competition: Competition;
  className?: string;
};

export default function CompetitionCard({
  competition,
  className,
}: CompetitionCardProps) {
  const isLive = competition.live?.isLive;
  const votingEnds = competition.votingEndsAt
    ? new Date(competition.votingEndsAt)
    : null;

  return (
    <Card
      className={cn(
        'group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg',
        className
      )}
    >
      <Link href={`/competitions/${competition.id}`} className="block">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <Image
            src={competition.coverImage || FALLBACK_IMAGE}
            alt={competition.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 flex gap-2">
            {isLive && (
              <Badge className="gap-1 bg-red-600 text-white hover:bg-red-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                EN DIRECT
              </Badge>
            )}
            <Badge variant="secondary">
              {COMPETITION_STATUS_LABELS[competition.status] ?? competition.status}
            </Badge>
          </div>
        </div>
      </Link>

      <CardContent className="space-y-2 p-4">
        <Badge variant="outline">{competition.category}</Badge>
        <Link href={`/competitions/${competition.id}`}>
          <h3 className="font-headline line-clamp-2 text-lg font-bold transition-colors group-hover:text-primary">
            {competition.title}
          </h3>
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {competition.description}
        </p>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t p-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <VoteIcon className="h-4 w-4 text-primary" />
          {formatVotes(competition.stats?.totalVotes ?? 0)} votes
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          {competition.stats?.candidatesCount ?? 0} candidats
        </span>
        {competition.live?.enabled && (
          <span className="flex items-center gap-1.5">
            <Radio className="h-4 w-4" />
            Direct
          </span>
        )}
        {votingEnds && (
          <span className="flex w-full items-center gap-1.5">
            <CalendarClock className="h-4 w-4" />
            Clôture le{' '}
            {votingEnds.toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}

CompetitionCard.Skeleton = function CompetitionCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <CardContent className="space-y-3 p-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
      <CardFooter className="border-t p-4">
        <Skeleton className="h-4 w-32" />
      </CardFooter>
    </Card>
  );
};
