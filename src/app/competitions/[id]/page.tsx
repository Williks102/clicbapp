import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarClock, Gift, Radio, Trophy, Users, Vote as VoteIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Countdown } from '@/components/countdown';
import CandidateCard from '@/components/candidate-card';
import { LiveLeaderboard } from '@/components/live-leaderboard';
import {
  getCandidatesForCompetition,
  getCompetition,
} from '@/app/actions/competition-actions';
import { COMPETITION_STATUS_LABELS, isVotingOpen } from '@/lib/live-utils';
import { formatFCFA, formatVotes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const FALLBACK_IMAGE = 'https://placehold.co/1600x900/1f2937/ffffff?text=ClicVote';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const competition = await getCompetition(id);

  if (!competition) return { title: 'Concours introuvable — ClicVote' };

  return {
    title: `${competition.title} — ClicVote`,
    description: competition.description?.slice(0, 160),
  };
}

export default async function CompetitionPage({ params }: PageProps) {
  const { id } = await params;
  const competition = await getCompetition(id);

  if (!competition || competition.status === 'draft') {
    notFound();
  }

  const candidates = await getCandidatesForCompetition(id);
  const votingOpen = isVotingOpen(competition);
  const totalVotes = competition.stats?.totalVotes ?? 0;
  const winner = competition.winnerCandidateId
    ? candidates.find((c) => c.id === competition.winnerCandidateId)
    : undefined;

  const cheapestPack = [...(competition.votePacks ?? [])].sort(
    (a, b) => a.price - b.price
  )[0];

  return (
    <>
      {/* ---------- Bannière ---------- */}
      <section className="relative">
        <div className="relative h-64 w-full overflow-hidden bg-muted md:h-80">
          <Image
            src={competition.coverImage || FALLBACK_IMAGE}
            alt={competition.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        </div>

        <div className="container mx-auto -mt-32 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {COMPETITION_STATUS_LABELS[competition.status] ?? competition.status}
            </Badge>
            <Badge variant="outline">{competition.category}</Badge>
            {competition.live?.isLive && (
              <Badge className="gap-1.5 bg-red-600 text-white hover:bg-red-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                EN DIRECT
              </Badge>
            )}
          </div>

          <h1 className="font-headline mt-3 text-3xl font-bold tracking-tight md:text-5xl">
            {competition.title}
          </h1>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <VoteIcon className="h-4 w-4 text-primary" />
              {formatVotes(totalVotes)} votes
            </span>
            {competition.votingEnabled && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {candidates.length} candidats
              </span>
            )}
            {competition.votingEndsAt && (
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4" />
                Clôture le{' '}
                {new Date(competition.votingEndsAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            )}
            {competition.organizerName && (
              <span>Organisé par {competition.organizerName}</span>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {competition.live?.enabled && (
              <Button asChild size="lg">
                <Link href={`/competitions/${competition.id}/live`}>
                  <Radio className="mr-2 h-5 w-5" />
                  {competition.live.isLive ? 'Regarder le direct' : 'Page du direct'}
                </Link>
              </Button>
            )}
            {votingOpen && candidates.length > 0 && (
              <Button asChild size="lg" variant="outline">
                <Link href="#candidats">
                  <VoteIcon className="mr-2 h-5 w-5" />
                  Voir les candidats
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8">
            {/* ---------- Vainqueur ---------- */}
            {winner && (
              <Card className="border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Vainqueur du concours
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
                    <Image
                      src={winner.photo || FALLBACK_IMAGE}
                      alt={winner.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-headline text-xl font-bold">{winner.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatVotes(winner.voteCount)} votes — dossard n°{winner.number}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ---------- Présentation ---------- */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">À propos du concours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-muted-foreground">
                  {competition.description}
                </p>
              </CardContent>
            </Card>

            {/* ---------- Candidats ---------- */}
            {competition.votingEnabled && (
            <div id="candidats" className="scroll-mt-20">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-headline text-2xl font-bold">
                  Les candidats ({candidates.length})
                </h2>
              </div>

              {candidates.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                  <p className="text-muted-foreground">
                    Les candidats seront annoncés prochainement.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {candidates.map((candidate, index) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      rank={competition.hideResults ? undefined : index + 1}
                      percentage={
                        competition.hideResults || totalVotes === 0
                          ? undefined
                          : (candidate.voteCount / totalVotes) * 100
                      }
                      showVotes={!competition.hideResults}
                      votingOpen={votingOpen}
                    />
                  ))}
                </div>
              )}
            </div>
            )}
          </div>

          {/* ---------- Colonne latérale ---------- */}
          <aside className="space-y-6">
            {!competition.votingEnabled ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Événement en diffusion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Cet événement est retransmis en direct. Il ne comporte pas de
                    vote.
                  </p>
                </CardContent>
              </Card>
            ) : votingOpen ? (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Les votes sont ouverts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {competition.votingEndsAt && (
                    <Countdown
                      target={competition.votingEndsAt}
                      label="Fin des votes dans"
                    />
                  )}
                  {competition.freeVote?.enabled && (
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      1 vote gratuit toutes les {competition.freeVote.cooldownHours} h
                      pour chaque membre connecté.
                    </p>
                  )}
                  {cheapestPack && (
                    <p className="text-sm text-muted-foreground">
                      Packs de votes à partir de{' '}
                      <strong className="text-foreground">
                        {formatFCFA(cheapestPack.price)}
                      </strong>
                      .
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {competition.status === 'published'
                      ? 'Votes bientôt ouverts'
                      : 'Votes clôturés'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {competition.status === 'published' && competition.votingStartsAt ? (
                    <Countdown
                      target={competition.votingStartsAt}
                      label="Ouverture des votes dans"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Le vote est terminé pour ce concours.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <LiveLeaderboard
              competitionId={competition.id}
              limit={10}
              hideResults={competition.hideResults}
            />

            {competition.votePacks?.length > 0 && votingOpen && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Packs de votes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {competition.votePacks.map((pack) => (
                    <div
                      key={pack.id}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold">{pack.name}</p>
                        <p className="text-muted-foreground">
                          {pack.votes.toLocaleString('fr-FR')} votes
                        </p>
                      </div>
                      <span className="font-bold text-primary">
                        {formatFCFA(pack.price)}
                      </span>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-muted-foreground">
                    Choisissez un candidat pour acheter un pack.
                  </p>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
