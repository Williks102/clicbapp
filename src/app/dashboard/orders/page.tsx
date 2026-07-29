import { PlayCircle, Receipt, Vote as VoteIcon, Wallet } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { OrdersTable } from '@/components/dashboard/orders-table';
import { getOrganizerOrders } from '@/app/actions/order-actions';
import { formatFCFA, formatVotes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardOrdersPage() {
  const orders = await getOrganizerOrders();
  const paid = orders.filter((order) => order.status === 'PAID');

  const revenue = paid.reduce((sum, order) => sum + order.amount, 0);
  const votesSold = paid.reduce((sum, order) => sum + (order.votes ?? 0), 0);
  const liveAccess = paid.filter((order) => order.type === 'LIVE_ACCESS').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventes de votes"
        description="Suivez les commandes de packs de votes et d'accès aux directs."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenus encaissés"
          value={formatFCFA(revenue)}
          description={`${paid.length} commande(s) payée(s)`}
          icon={Wallet}
        />
        <StatCard
          title="Votes vendus"
          value={formatVotes(votesSold)}
          description="Packs de votes crédités"
          icon={VoteIcon}
        />
        <StatCard
          title="Accès live"
          value={String(liveAccess)}
          description="Diffusions vendues"
          icon={PlayCircle}
        />
        <StatCard
          title="Commandes totales"
          value={String(orders.length)}
          description={`${orders.length - paid.length} non abouties`}
          icon={Receipt}
        />
      </div>

      <OrdersTable orders={orders} />
    </div>
  );
}
