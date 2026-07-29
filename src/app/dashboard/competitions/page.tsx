import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle, Radio, Settings2, Users, Vote as VoteIcon } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getCompetitionsForOrganizer } from '@/app/actions/competition-actions';
import { COMPETITION_STATUS_LABELS } from '@/lib/live-utils';
import { formatVotes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const FALLBACK_IMAGE = 'https://placehold.co/400x225/1f2937/ffffff?text=Concours';

export default async function DashboardCompetitionsPage() {
  const competitions = await getCompetitionsForOrganizer();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Mes concours"
          description="Gérez vos compétitions, vos candidats et vos diffusions."
        />
        <Button asChild>
          <Link href="/dashboard/competitions/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer un concours
          </Link>
        </Button>
      </div>

      {competitions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">
              Vous n&apos;avez pas encore créé de concours.
            </p>
            <Button asChild>
              <Link href="/dashboard/competitions/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Créer mon premier concours
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {competitions.map((competition) => (
            <Card key={competition.id}>
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
                      {COMPETITION_STATUS_LABELS[competition.status] ??
                        competition.status}
                    </Badge>
                    {competition.live?.isLive && (
                      <Badge className="gap-1.5 bg-red-600 text-white hover:bg-red-600">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                        EN DIRECT
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-headline mt-1 text-lg font-bold">
                    {competition.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <VoteIcon className="h-4 w-4" />
                      {formatVotes(competition.stats?.totalVotes ?? 0)} votes
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {competition.stats?.candidatesCount ?? 0} candidats
                    </span>
                    <span>
                      Clôture le{' '}
                      {new Date(competition.votingEndsAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/competitions/${competition.id}/candidates`}>
                      <Users className="mr-2 h-4 w-4" />
                      Candidats
                    </Link>
                  </Button>
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
          ))}
        </div>
      )}
    </div>
  );
}
