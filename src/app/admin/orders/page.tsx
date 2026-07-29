import { PlayCircle, Receipt, Vote as VoteIcon, Wallet } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { OrdersTable } from '@/components/dashboard/orders-table';
import { getOrganizerOrders } from '@/app/actions/order-actions';
import { formatFCFA, formatVotes } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  // Pour un administrateur, cette action retourne l'ensemble des commandes.
  const orders = await getOrganizerOrders();
  const paid = orders.filter((order) => order.status === 'PAID');

  const revenue = paid.reduce((sum, order) => sum + order.amount, 0);
  const votesSold = paid.reduce((sum, order) => sum + (order.votes ?? 0), 0);
  const flagged = orders.filter((order) => order.status === 'FLAGGED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commandes"
        description="Toutes les transactions de la plateforme : packs de votes et accès aux directs."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chiffre d'affaires"
          value={formatFCFA(revenue)}
          description={`${paid.length} commande(s) payée(s)`}
          icon={Wallet}
        />
        <StatCard
          title="Votes vendus"
          value={formatVotes(votesSold)}
          description="Toutes compétitions confondues"
          icon={VoteIcon}
        />
        <StatCard
          title="Accès live"
          value={String(paid.filter((order) => order.type === 'LIVE_ACCESS').length)}
          description="Diffusions vendues"
          icon={PlayCircle}
        />
        <StatCard
          title="À vérifier"
          value={String(flagged)}
          description="Montants incohérents détectés"
          icon={Receipt}
        />
      </div>

      <OrdersTable orders={orders} />
    </div>
  );
}
