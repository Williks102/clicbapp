import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarClock } from 'lucide-react';

import { auth } from '@/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Countdown } from '@/components/countdown';
import { LivePlayer } from '@/components/live-player';
import { LivePaywall } from '@/components/live-paywall';
import { LiveChat } from '@/components/live-chat';
import { LiveLeaderboard } from '@/components/live-leaderboard';
import { LiveVotePanel } from '@/components/live-vote-panel';
import { getCompetition } from '@/app/actions/competition-actions';
import { checkLiveAccess } from '@/app/actions/live-actions';
import { isVotingOpen } from '@/lib/live-utils';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const competition = await getCompetition(id);

  if (!competition) return { title: 'Direct introuvable — ClicVote' };

  return {
    title: `${competition.live?.title || competition.title} — Direct ClicVote`,
  };
}

export default async function LiveCompetitionPage({ params }: PageProps) {
  const { id } = await params;
  const competition = await getCompetition(id);

  if (!competition || competition.status === 'draft') {
    notFound();
  }

  if (!competition.live?.enabled) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-headline text-2xl font-bold">
          Aucune diffusion prévue
        </h1>
        <p className="mt-2 text-muted-foreground">
          L&apos;organisateur n&apos;a pas activé de diffusion en direct pour ce concours.
        </p>
        <Button className="mt-6" asChild>
          <Link href={`/competitions/${competition.id}`}>Voir le concours</Link>
        </Button>
      </div>
    );
  }

  const [session, access] = await Promise.all([auth(), checkLiveAccess(id)]);
  const votingOpen = isVotingOpen(competition);
  const canModerate =
    session?.user?.id === competition.organizerId || session?.user?.role === 'admin';

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href={`/competitions/${competition.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au concours
        </Link>
      </Button>

      {!access.hasAccess ? (
        <div className="space-y-6">
          <div className="text-center">
            <Badge variant="secondary" className="mb-3">
              {competition.category}
            </Badge>
            <h1 className="font-headline text-3xl font-bold tracking-tight">
              {competition.title}
            </h1>
            {competition.live.scheduledAt && !competition.live.isLive && (
              <div className="mt-4 flex justify-center">
                <Countdown
                  target={competition.live.scheduledAt}
                  label="Début du direct dans"
                />
              </div>
            )}
          </div>

          <LivePaywall competition={competition} requiresLogin={access.requiresLogin} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {/*
              Un accès accordé par le rôle se voit : sans cela, un organisateur
              qui teste ses propres directs peut croire qu'un accès acheté vaut
              pour tous les événements.
            */}
            {(access.reason === 'organizer' || access.reason === 'admin') && (
              <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {access.reason === 'organizer'
                  ? "Vous voyez ce direct en tant qu'organisateur de l'événement. Le public doit acheter un accès."
                  : 'Vous voyez ce direct en tant qu’administrateur. Le public doit acheter un accès.'}
              </div>
            )}
            <LivePlayer live={competition.live} competitionTitle={competition.title} />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{competition.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {competition.description}
                </p>
                {competition.live.scheduledAt && !competition.live.isLive && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarClock className="h-4 w-4" />
                    Prochaine diffusion le{' '}
                    {new Date(competition.live.scheduledAt).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Une retransmission sans scrutin n'a ni candidats ni classement. */}
            {competition.votingEnabled && (
              <>
                <div className="lg:hidden">
                  <LiveVotePanel competition={competition} votingOpen={votingOpen} />
                </div>

                <LiveLeaderboard
                  competitionId={competition.id}
                  hideResults={competition.hideResults}
                />
              </>
            )}
          </div>

          <aside className="space-y-6">
            {competition.votingEnabled && (
              <div className="hidden lg:block">
                <LiveVotePanel competition={competition} votingOpen={votingOpen} />
              </div>
            )}

            {competition.live.chatEnabled && (
              <LiveChat competitionId={competition.id} canModerate={canModerate} />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
