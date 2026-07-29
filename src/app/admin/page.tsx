import Link from 'next/link';
import { Building2, Trophy, Users, Vote as VoteIcon, Wallet } from 'lucide-react';

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
import { getAdminStats } from '@/app/actions/stats-actions';
import { formatFCFA, formatVotes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Dashboard administrateur"
          description="Vue d'ensemble de la plateforme de vote et de diffusion."
        />
        <Button variant="outline" asChild>
          <Link href="/admin/commissions">
            <Wallet className="mr-2 h-4 w-4" />
            Commissions &amp; reversements
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenus plateforme"
          value={formatFCFA(stats.totalRevenue)}
          description="Chiffre d'affaires brut"
          icon={Wallet}
        />
        <StatCard
          title="Votes enregistrés"
          value={formatVotes(stats.totalVotes)}
          description={`${formatVotes(stats.paidVotes)} payants · ${formatVotes(stats.freeVotes)} gratuits`}
          icon={VoteIcon}
        />
        <StatCard
          title="Organisateurs"
          value={String(stats.totalOrganizers)}
          description={`${stats.totalCompetitions} concours créés`}
          icon={Building2}
        />
        <StatCard
          title="Membres"
          value={String(stats.totalCustomers)}
          description="Comptes votants actifs"
          icon={Users}
        />
      </div>

      <VotesChart data={stats.votesByMonth} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-primary" />
              Concours les plus performants
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.topCompetitions.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Aucun concours enregistré.
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
                      <TableCell className="font-medium">{item.title}</TableCell>
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
              <Building2 className="h-5 w-5 text-primary" />
              Meilleurs organisateurs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.topOrganizers.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Aucun organisateur actif.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisateur</TableHead>
                    <TableHead className="text-right">Votes</TableHead>
                    <TableHead className="text-right">Revenus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topOrganizers.map((item) => (
                    <TableRow key={item.organizerId}>
                      <TableCell className="font-medium">
                        {item.organizerName}
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
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Dernières commandes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentOrders.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune commande enregistrée.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Concours</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id}</TableCell>
                      <TableCell className="max-w-[160px] truncate">
                        {order.customerName}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">
                        {order.competitionTitle}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
