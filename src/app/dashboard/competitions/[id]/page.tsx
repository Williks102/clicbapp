import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Gift, Radio, Users, Vote as VoteIcon, Wallet } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/stat-card';
import { CompetitionTabs } from '@/components/dashboard/competition-tabs';
import { CompetitionControls } from '@/components/dashboard/competition-controls';
import {
  getCandidatesForCompetition,
  getOwnedCompetition,
} from '@/app/actions/competition-actions';
import { getOrganizerOrders } from '@/app/actions/order-actions';
import { COMPETITION_STATUS_LABELS } from '@/lib/live-utils';
import { formatFCFA, formatVotes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function CompetitionOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const competition = await getOwnedCompetition(id);

  if (!competition) notFound();

  const [candidates, allOrders] = await Promise.all([
    getCandidatesForCompetition(id),
    getOrganizerOrders(),
  ]);

  const orders = allOrders.filter(
    (order) => order.competitionId === id && order.status === 'PAID'
  );
  const revenue = orders.reduce((sum, order) => sum + order.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={competition.title}
          description={
            competition.votingEndsAt
              ? `${competition.category} · Clôture le ${new Date(
                  competition.votingEndsAt
                ).toLocaleDateString('fr-FR')}`
              : `${competition.category} · Diffusion sans vote`
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {COMPETITION_STATUS_LABELS[competition.status] ?? competition.status}
          </Badge>
          {competition.live?.isLive && (
            <Badge className="gap-1.5 bg-red-600 text-white hover:bg-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              EN DIRECT
            </Badge>
          )}
        </div>
      </div>

      <CompetitionTabs
        competitionId={competition.id}
        liveEnabled={competition.live?.enabled}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Votes totaux"
          value={formatVotes(competition.stats?.totalVotes ?? 0)}
          description={`${formatVotes(competition.stats?.paidVotes ?? 0)} payants`}
          icon={VoteIcon}
        />
        <StatCard
          title="Votes gratuits"
          value={formatVotes(competition.stats?.freeVotes ?? 0)}
          description={
            competition.freeVote?.enabled
              ? `1 vote / ${competition.freeVote.cooldownHours} h`
              : 'Désactivé'
          }
          icon={Gift}
        />
        <StatCard
          title="Revenus"
          value={formatFCFA(revenue)}
          description={`${orders.length} commande(s) payée(s)`}
          icon={Wallet}
        />
        <StatCard
          title="Candidats"
          value={String(candidates.length)}
          description={`${candidates.filter((c) => c.eliminated).length} éliminé(s)`}
          icon={Users}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Classement actuel</CardTitle>
          </CardHeader>
          <CardContent>
            {candidates.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun candidat enregistré.
                </p>
                <Button className="mt-4" size="sm" asChild>
                  <Link href={`/dashboard/competitions/${competition.id}/candidates`}>
                    Ajouter des candidats
                  </Link>
                </Button>
              </div>
            ) : (
              <ol className="space-y-2">
                {candidates.slice(0, 10).map((candidate, index) => (
                  <li
                    key={candidate.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {candidate.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Dossard n°{candidate.number}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold tabular-nums">
                        {formatVotes(candidate.voteCount)}
                      </span>
                      <span className="text-xs text-muted-foreground">votes</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pilotage du concours</CardTitle>
          </CardHeader>
          <CardContent>
            <CompetitionControls
              competitionId={competition.id}
              status={competition.status}
              candidates={candidates}
              winnerCandidateId={competition.winnerCandidateId}
            />
          </CardContent>
        </Card>
      </div>

      {competition.live?.enabled && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-start gap-3">
              <Radio className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">
                  {competition.live.isLive
                    ? 'Votre direct est en cours'
                    : 'Diffusion configurée'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {competition.live.paid
                    ? `Accès vendu ${formatFCFA(competition.live.price)}`
                    : 'Accès libre pour tous les spectateurs'}
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href={`/dashboard/competitions/${competition.id}/live`}>
                Ouvrir la régie
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
