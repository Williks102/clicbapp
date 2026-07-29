import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Medal, Radio } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { VotePanel } from '@/components/vote-panel';
import { LiveLeaderboard } from '@/components/live-leaderboard';
import { getCompetition } from '@/app/actions/competition-actions';
import { getCandidate } from '@/app/actions/candidate-actions';
import { isVotingOpen } from '@/lib/live-utils';
import { formatVotes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const FALLBACK_PHOTO = 'https://placehold.co/800x800/1f2937/ffffff?text=Candidat';

type PageProps = { params: Promise<{ id: string; candidateId: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { candidateId } = await params;
  const candidate = await getCandidate(candidateId);

  if (!candidate) return { title: 'Candidat introuvable — ClicVote' };

  return {
    title: `Voter pour ${candidate.name} — ClicVote`,
    description: candidate.bio?.slice(0, 160),
  };
}

export default async function CandidatePage({ params }: PageProps) {
  const { id, candidateId } = await params;

  const [competition, candidate] = await Promise.all([
    getCompetition(id),
    getCandidate(candidateId),
  ]);

  if (
    !competition ||
    competition.status === 'draft' ||
    !candidate ||
    candidate.competitionId !== competition.id
  ) {
    notFound();
  }

  const votingOpen = isVotingOpen(competition);
  const totalVotes = competition.stats?.totalVotes ?? 0;
  const share = totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href={`/competitions/${competition.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au concours
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-[240px_1fr]">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
              <Image
                src={candidate.photo || FALLBACK_PHOTO}
                alt={candidate.name}
                fill
                priority
                sizes="(max-width: 640px) 100vw, 240px"
                className="object-cover"
              />
              <Badge className="absolute right-3 top-3" variant="secondary">
                N°{candidate.number}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{competition.category}</Badge>
                {candidate.eliminated && <Badge variant="destructive">Éliminé</Badge>}
                {competition.live?.isLive && (
                  <Badge className="gap-1.5 bg-red-600 text-white hover:bg-red-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    EN DIRECT
                  </Badge>
                )}
              </div>

              <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">
                {candidate.name}
              </h1>

              <Link
                href={`/competitions/${competition.id}`}
                className="block text-muted-foreground hover:text-primary"
              >
                {competition.title}
              </Link>

              {candidate.city && (
                <p className="text-sm text-muted-foreground">{candidate.city}</p>
              )}

              {!competition.hideResults && (
                <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Medal className="h-4 w-4 text-primary" />
                      Total des votes
                    </span>
                    <span className="font-headline text-2xl font-bold text-primary">
                      {formatVotes(candidate.voteCount)}
                    </span>
                  </div>
                  <Progress value={share} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {share.toFixed(1).replace('.', ',')} % des votes du concours
                    {' · '}
                    {formatVotes(candidate.freeVoteCount)} gratuits,{' '}
                    {formatVotes(candidate.paidVoteCount)} boostés
                  </p>
                </div>
              )}

              {competition.live?.enabled && (
                <Button variant="outline" asChild>
                  <Link href={`/competitions/${competition.id}/live`}>
                    <Radio className="mr-2 h-4 w-4" />
                    Suivre le direct
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {candidate.bio && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Présentation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-muted-foreground">
                  {candidate.bio}
                </p>
              </CardContent>
            </Card>
          )}

          <LiveLeaderboard
            competitionId={competition.id}
            limit={10}
            hideResults={competition.hideResults}
            title="Classement du concours"
          />
        </div>

        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <VotePanel
            competition={competition}
            candidate={candidate}
            votingOpen={votingOpen}
          />
        </aside>
      </div>
    </div>
  );
}
