import Link from 'next/link';
import { Gift, PlayCircle, Receipt, Vote as VoteIcon, Wallet } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAccountActivity } from '@/app/actions/account-actions';
import { formatFCFA, formatVotes } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Mon activité | ClicVote',
  description: 'Retrouvez vos votes, vos accès aux directs et vos paiements.',
};

const STATUS_LABELS: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PAID: { label: 'Payé', variant: 'default' },
  PENDING: { label: 'En attente', variant: 'secondary' },
  FAILED: { label: 'Échoué', variant: 'destructive' },
  FLAGGED: { label: 'À vérifier', variant: 'destructive' },
  REFUNDED: { label: 'Remboursé', variant: 'outline' },
  EXPIRED: { label: 'Expiré', variant: 'outline' },
};

export default async function AccountPage() {
  const { success, activity, error } = await getAccountActivity();

  if (!success || !activity) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mon activité" />
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-4" asChild>
              <Link href="/login?callbackUrl=/account">Se connecter</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { votes, liveAccesses, orders, totalVotesCast, totalSpent } = activity;
  const freeVotes = votes.filter(({ vote }) => vote.type === 'free').length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mon activité"
        description="Vos votes, vos accès aux directs et l'historique de vos paiements."
      />

      {/* ---------- Résumé ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<VoteIcon className="h-5 w-5" />}
          label="Votes exprimés"
          value={formatVotes(totalVotesCast)}
        />
        <StatCard
          icon={<Gift className="h-5 w-5" />}
          label="Votes gratuits"
          value={String(freeVotes)}
        />
        <StatCard
          icon={<PlayCircle className="h-5 w-5" />}
          label="Accès aux directs"
          value={String(liveAccesses.length)}
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Total dépensé"
          value={formatFCFA(totalSpent)}
        />
      </div>

      {/* ---------- Accès live ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <PlayCircle className="h-5 w-5 text-primary" />
            Mes accès aux directs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liveAccesses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Vous n&apos;avez pas encore acheté d&apos;accès à un direct.
            </p>
          ) : (
            <div className="space-y-2">
              {liveAccesses.map(({ access, competition }) => (
                <div
                  key={access.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {competition?.title ?? 'Concours supprimé'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Acheté le{' '}
                      {new Date(access.purchaseDate).toLocaleDateString('fr-FR')} ·{' '}
                      {formatFCFA(access.pricePaid)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {competition?.live?.isLive && (
                      <Badge className="gap-1.5 bg-red-600 text-white hover:bg-red-600">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                        EN DIRECT
                      </Badge>
                    )}
                    {competition && (
                      <Button size="sm" asChild>
                        <Link href={`/competitions/${competition.id}/live`}>
                          Accéder
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------- Votes ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <VoteIcon className="h-5 w-5 text-primary" />
            Mes votes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {votes.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">
                Vous n&apos;avez pas encore voté.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/competitions">Découvrir les concours</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidat</TableHead>
                    <TableHead>Concours</TableHead>
                    <TableHead className="text-right">Votes</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {votes.slice(0, 50).map(({ vote, competition }) => (
                    <TableRow key={vote.id}>
                      <TableCell className="font-medium">
                        {competition ? (
                          <Link
                            href={`/competitions/${vote.competitionId}/candidates/${vote.candidateId}`}
                            className="hover:text-primary"
                          >
                            {vote.candidateName}
                          </Link>
                        ) : (
                          vote.candidateName
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {competition?.title ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {vote.quantity.toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={vote.type === 'paid' ? 'default' : 'secondary'}>
                          {vote.type === 'paid' ? 'Pack' : 'Gratuit'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(vote.createdAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------- Paiements ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-primary" />
            Mes paiements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Aucun paiement enregistré.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Objet</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const status = STATUS_LABELS[order.status] ?? {
                      label: order.status,
                      variant: 'outline' as const,
                    };

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id}</TableCell>
                        <TableCell>
                          {order.type === 'VOTE_PACK'
                            ? `${order.votes} votes — ${order.candidateName}`
                            : `Accès direct — ${order.competitionTitle}`}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatFCFA(order.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="font-headline text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
