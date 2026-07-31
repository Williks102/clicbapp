import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EventCard } from '@/components/dashboard/event-card';
import { getCompetitionsForOrganizer } from '@/app/actions/competition-actions';

export const dynamic = 'force-dynamic';

/**
 * Diffusions sans scrutin de l'organisateur.
 *
 * Les concours qui comportent aussi un direct restent dans « Mes concours » :
 * leur régie s'atteint depuis leur propre ligne. Cette liste ne recense que les
 * événements dont la diffusion est l'unique objet.
 */
export default async function DashboardLiveEventsPage() {
  const all = await getCompetitionsForOrganizer();
  const events = all.filter((competition) => !competition.votingEnabled);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Mes directs"
          description="Événements diffusés sans vote : flux, accès payant et chat."
        />
        <Button asChild>
          <Link href="/dashboard/live/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer un direct
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">
              Vous n&apos;avez pas encore de diffusion sans vote.
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Pour retransmettre un événement sans organiser de scrutin :
              ni candidats, ni packs de votes, seulement le flux et son accès.
            </p>
            <Button asChild>
              <Link href="/dashboard/live/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Créer mon premier direct
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard key={event.id} competition={event} />
          ))}
        </div>
      )}
    </div>
  );
}
