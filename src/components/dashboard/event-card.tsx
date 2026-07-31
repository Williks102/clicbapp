import Link from 'next/link';
import Image from 'next/image';
import { Radio, Settings2, Users, Vote as VoteIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { COMPETITION_STATUS_LABELS, LIVE_EVENT_STATUS_LABELS } from '@/lib/live-utils';
import { formatVotes } from '@/lib/utils';
import type { Competition } from '@/lib/types';

const FALLBACK_IMAGE = 'https://placehold.co/400x225/1f2937/ffffff?text=ClicVote';

/**
 * Ligne d'un événement dans l'espace organisateur.
 *
 * Concours et diffusions partagent la même entité : cette carte sert les deux
 * listes et n'affiche que ce qui a du sens — candidats et votes disparaissent
 * pour une retransmission, dont les statuts portent d'autres libellés.
 */
export function EventCard({ competition }: { competition: Competition }) {
  const isLiveEvent = !competition.votingEnabled;
  const labels = isLiveEvent ? LIVE_EVENT_STATUS_LABELS : COMPETITION_STATUS_LABELS;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image
            src={competition.coverImage || FALLBACK_IMAGE}
            alt={competition.title}
            fill
            sizes="128px"
            className="object-cover"
          />
        </div>

        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {labels[competition.status] ?? competition.status}
            </Badge>
            {competition.live?.isLive && (
              <Badge className="gap-1.5 bg-red-600 text-white hover:bg-red-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                EN DIRECT
              </Badge>
            )}
          </div>

          <h3 className="font-headline mt-1 text-lg font-bold">{competition.title}</h3>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {!isLiveEvent && (
              <>
                <span className="flex items-center gap-1.5">
                  <VoteIcon className="h-4 w-4" />
                  {formatVotes(competition.stats?.totalVotes ?? 0)} votes
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {competition.stats?.candidatesCount ?? 0} candidats
                </span>
              </>
            )}

            <span>
              {isLiveEvent
                ? competition.live?.scheduledAt
                  ? `Programmé le ${new Date(
                      competition.live.scheduledAt
                    ).toLocaleDateString('fr-FR')}`
                  : 'Diffusion sans date'
                : competition.votingEndsAt
                  ? `Clôture le ${new Date(competition.votingEndsAt).toLocaleDateString('fr-FR')}`
                  : '—'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isLiveEvent && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/competitions/${competition.id}/candidates`}>
                <Users className="mr-2 h-4 w-4" />
                Candidats
              </Link>
            </Button>
          )}
          {competition.live?.enabled && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/competitions/${competition.id}/live`}>
                <Radio className="mr-2 h-4 w-4" />
                Régie
              </Link>
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href={`/dashboard/competitions/${competition.id}`}>
              <Settings2 className="mr-2 h-4 w-4" />
              Gérer
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
