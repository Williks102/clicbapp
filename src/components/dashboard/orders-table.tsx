'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatFCFA } from '@/lib/utils';
import type { Order, OrderStatus } from '@/lib/types';

const STATUS_META: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PAID: { label: 'Payé', variant: 'default' },
  PENDING: { label: 'En attente', variant: 'secondary' },
  FAILED: { label: 'Échoué', variant: 'destructive' },
  FLAGGED: { label: 'À vérifier', variant: 'destructive' },
  REFUNDED: { label: 'Remboursé', variant: 'outline' },
  EXPIRED: { label: 'Expiré', variant: 'outline' },
};

const STATUS_FILTERS: Array<{ value: 'all' | OrderStatus; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'PAID', label: 'Payées' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'EXPIRED', label: 'Expirées' },
  { value: 'FAILED', label: 'Échouées' },
  { value: 'FLAGGED', label: 'À vérifier' },
];

type OrdersTableProps = {
  orders: Order[];
  /** Affiche la colonne concours (utile côté admin et multi-concours). */
  showCompetition?: boolean;
};

export function OrdersTable({ orders, showCompetition = true }: OrdersTableProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | OrderStatus>('all');

  const filtered = useMemo(() => {
    let results = orders;

    if (status !== 'all') results = results.filter((order) => order.status === status);

    if (search) {
      const term = search.toLowerCase();
      results = results.filter(
        (order) =>
          order.id.toLowerCase().includes(term) ||
          order.customerName?.toLowerCase().includes(term) ||
          order.customerEmail?.toLowerCase().includes(term) ||
          order.candidateName?.toLowerCase().includes(term) ||
          order.competitionTitle?.toLowerCase().includes(term)
      );
    }

    return results;
  }, [orders, search, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par référence, client, candidat…"
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              size="sm"
              variant={status === filter.value ? 'default' : 'outline'}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Client</TableHead>
              {showCompetition && <TableHead>Concours</TableHead>}
              <TableHead>Objet</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showCompetition ? 7 : 6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucune commande ne correspond à ces critères.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => {
                const meta = STATUS_META[order.status] ?? {
                  label: order.status,
                  variant: 'outline' as const,
                };

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell>
                      <div className="max-w-[180px]">
                        <p className="truncate font-medium">{order.customerName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {order.customerEmail}
                        </p>
                      </div>
                    </TableCell>
                    {showCompetition && (
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">
                        {order.competitionTitle}
                      </TableCell>
                    )}
                    <TableCell className="text-sm">
                      {order.type === 'VOTE_PACK'
                        ? `${order.votes} votes → ${order.candidateName}`
                        : 'Accès au direct'}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatFCFA(order.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} commande{filtered.length > 1 ? 's' : ''} affichée
        {filtered.length > 1 ? 's' : ''} sur {orders.length}.
      </p>
    </div>
  );
}
