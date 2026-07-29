import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DeleteCompetitionButton } from '@/components/admin/delete-competition-button';
import { getAllCompetitions } from '@/app/actions/admin-actions';
import { COMPETITION_STATUS_LABELS } from '@/lib/live-utils';
import { formatVotes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminCompetitionsPage() {
  const competitions = await getAllCompetitions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Concours"
        description="Tous les concours créés sur la plateforme."
      />

      <Card>
        <CardContent className="p-0">
          {competitions.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              Aucun concours enregistré.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concours</TableHead>
                    <TableHead>Organisateur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Votes</TableHead>
                    <TableHead className="text-right">Candidats</TableHead>
                    <TableHead>Direct</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitions.map((competition) => (
                    <TableRow key={competition.id}>
                      <TableCell>
                        <p className="font-medium">{competition.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {competition.category}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {competition.organizerName || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {COMPETITION_STATUS_LABELS[competition.status] ??
                            competition.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatVotes(competition.stats?.totalVotes ?? 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {competition.stats?.candidatesCount ?? 0}
                      </TableCell>
                      <TableCell>
                        {competition.live?.isLive ? (
                          <Badge className="gap-1.5 bg-red-600 text-white hover:bg-red-600">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                            EN DIRECT
                          </Badge>
                        ) : competition.live?.enabled ? (
                          <span className="text-sm text-muted-foreground">
                            Configuré
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild title="Voir">
                            <Link
                              href={`/competitions/${competition.id}`}
                              target="_blank"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DeleteCompetitionButton
                            competitionId={competition.id}
                            competitionTitle={competition.title}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
