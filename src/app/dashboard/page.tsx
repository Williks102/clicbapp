import Link from 'next/link';
import { Gift, PlayCircle, PlusCircle, Trophy, Users, Vote as VoteIcon, Wallet } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatCard } from '@/components/dashboard/stat-card';
import { VotesChart } from '@/components/dashboard/votes-chart';
import { getOrganizerStats } from '@/app/actions/stats-actions';
import { formatFCFA, formatVotes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getOrganizerStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Tableau de bord"
          description="Vue d'ensemble de vos concours, de vos votes et de vos revenus."
        />
        <Button asChild>
          <Link href="/dashboard/competitions/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer un concours
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenus encaissés"
          value={formatFCFA(stats.totalRevenue)}
          description="Commandes payées"
          icon={Wallet}
        />
        <StatCard
          title="Votes totaux"
          value={formatVotes(stats.totalVotes)}
          description={`${formatVotes(stats.paidVotes)} payants · ${formatVotes(stats.freeVotes)} gratuits`}
          icon={VoteIcon}
        />
        <StatCard
          title="Concours"
          value={String(stats.totalCompetitions)}
          description={`${stats.totalCandidates} candidats`}
          icon={Trophy}
        />
        <StatCard
          title="Accès live vendus"
          value={String(stats.liveAccessSold)}
          description="Accès aux diffusions"
          icon={PlayCircle}
        />
      </div>

      <VotesChart data={stats.votesByMonth} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-primary" />
              Meilleurs concours
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.topCompetitions.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Créez votre premier concours pour voir vos statistiques.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concours</TableHead>
                    <TableHead className="text-right">Votes</TableHead>
                    <TableHead className="text-right">Revenus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topCompetitions.map((item) => (
                    <TableRow key={item.competitionId}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/competitions/${item.competitionId}`}
                          className="hover:text-primary"
                        >
                          {item.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatVotes(item.votes)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatFCFA(item.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Dernières commandes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentOrders.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Aucune commande pour le moment.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Objet</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentOrders.slice(0, 6).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="max-w-[140px] truncate font-medium">
                        {order.customerName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.type === 'VOTE_PACK'
                          ? `${order.votes} votes`
                          : 'Accès live'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatFCFA(order.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={order.status === 'PAID' ? 'default' : 'secondary'}
                        >
                          {order.status === 'PAID' ? 'Payé' : order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-start gap-3">
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Boostez votre audience</p>
              <p className="text-sm text-muted-foreground">
                Activez le vote gratuit pour attirer les votants, puis proposez des
                packs pour monétiser leur engagement.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/competitions">Gérer mes concours</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
