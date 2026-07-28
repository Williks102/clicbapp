'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { Crown, Loader2, TrendingUp } from 'lucide-react';
import { useCollection, useFirebase } from '@/firebase';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataError } from '@/components/data-error';
import { cn, formatVotes } from '@/lib/utils';
import type { Candidate } from '@/lib/types';

const FALLBACK_PHOTO = 'https://placehold.co/100x100/1f2937/ffffff?text=%20';

type LiveLeaderboardProps = {
  competitionId: string;
  /** Nombre de candidats affichés (tous si absent). */
  limit?: number;
  title?: string;
  /** Masque les scores tant que l'organisateur n'a pas publié les résultats. */
  hideResults?: boolean;
  className?: string;
};

export function LiveLeaderboard({
  competitionId,
  limit,
  title = 'Classement en direct',
  hideResults = false,
  className,
}: LiveLeaderboardProps) {
  const { areServicesAvailable, firestore } = useFirebase();

  const candidatesQuery = useMemo(
    () =>
      areServicesAvailable && firestore
        ? query(
            collection(firestore, 'candidates'),
            where('competitionId', '==', competitionId),
            orderBy('voteCount', 'desc')
          )
        : null,
    [areServicesAvailable, firestore, competitionId]
  );

  const {
    data: candidates,
    isLoading,
    error,
  } = useCollection<Candidate>(candidatesQuery);

  const entries = useMemo(() => {
    if (!candidates) return [];
    const total = candidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);
    const ranked = candidates.map((candidate, index) => ({
      candidate,
      rank: index + 1,
      percentage: total > 0 ? ((candidate.voteCount || 0) / total) * 100 : 0,
    }));
    return limit ? ranked.slice(0, limit) : ranked;
  }, [candidates, limit]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        <DataError error={error} subject="le classement" />

        {!isLoading && !error && entries.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun candidat pour le moment.
          </p>
        )}

        {hideResults && entries.length > 0 && (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Les scores sont masqués jusqu&apos;à la proclamation des résultats.
          </p>
        )}

        {!hideResults &&
          entries.map(({ candidate, rank, percentage }) => (
            <Link
              key={candidate.id}
              href={`/competitions/${competitionId}/candidates/${candidate.id}`}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60"
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  rank === 1
                    ? 'bg-amber-400 text-amber-950'
                    : rank === 2
                      ? 'bg-slate-300 text-slate-800'
                      : rank === 3
                        ? 'bg-orange-400 text-orange-950'
                        : 'bg-muted text-muted-foreground'
                )}
              >
                {rank}
              </span>

              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                <Image
                  src={candidate.photo || FALLBACK_PHOTO}
                  alt={candidate.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{candidate.name}</p>
                  {rank === 1 && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                </div>
                <Progress value={percentage} className="mt-1 h-1.5" />
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums">
                  {formatVotes(candidate.voteCount || 0)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {percentage.toFixed(1).replace('.', ',')} %
                </p>
              </div>
            </Link>
          ))}
      </CardContent>
    </Card>
  );
}
