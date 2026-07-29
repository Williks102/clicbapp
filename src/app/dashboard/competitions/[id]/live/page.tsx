import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Radio } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CompetitionTabs } from '@/components/dashboard/competition-tabs';
import { LiveControlPanel } from '@/components/dashboard/live-control-panel';
import { LiveStatusToggle } from '@/components/live-status-toggle';
import { LiveChat } from '@/components/live-chat';
import { LiveLeaderboard } from '@/components/live-leaderboard';
import { LivePlayer } from '@/components/live-player';
import { getOwnedCompetition } from '@/app/actions/competition-actions';
import { formatFCFA } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function LiveControlPage({ params }: PageProps) {
  const { id } = await params;
  const competition = await getOwnedCompetition(id);

  if (!competition) notFound();

  const live = competition.live;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Régie du direct"
          description={`Pilotez la diffusion de « ${competition.title} ».`}
        />
        <Button variant="outline" asChild>
          <Link href={`/competitions/${competition.id}/live`} target="_blank">
            <ExternalLink className="mr-2 h-4 w-4" />
            Voir la page spectateur
          </Link>
        </Button>
      </div>

      <CompetitionTabs competitionId={competition.id} liveEnabled={live?.enabled} />

      {!live?.enabled ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Radio className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              La diffusion en direct n&apos;est pas activée pour ce concours.
            </p>
            <Button asChild>
              <Link href={`/dashboard/competitions/${competition.id}/edit`}>
                Activer la diffusion
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Contrôle de l&apos;antenne</CardTitle>
                <CardDescription>
                  {live.paid
                    ? `Accès payant — ${formatFCFA(live.price)}`
                    : 'Accès libre pour tous les spectateurs'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <LiveStatusToggle
                  competitionId={competition.id}
                  isLive={live.isLive}
                  isEnabled={live.enabled}
                />
                <LiveControlPanel
                  competitionId={competition.id}
                  currentUrl={live.url}
                  chatEnabled={live.chatEnabled}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Prévisualisation</CardTitle>
                <CardDescription>
                  Ce que voient les spectateurs ayant accès au direct.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LivePlayer live={live} competitionTitle={competition.title} />
              </CardContent>
            </Card>

            <LiveLeaderboard
              competitionId={competition.id}
              title="Classement en temps réel"
            />
          </div>

          <aside>
            {live.chatEnabled ? (
              <LiveChat competitionId={competition.id} canModerate />
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Chat désactivé</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Activez le chat dans les réglages du concours pour permettre aux
                    spectateurs d&apos;échanger pendant la diffusion.
                  </p>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
