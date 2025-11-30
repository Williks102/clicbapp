import { 
  getCommissionSettings, 
  getOrganizerPayouts, 
  getRecentTransactions 
} from '@/app/actions/commission-actions';
import AdminCommissionsPageClient from './admin-commissions-page-client';

export const dynamic = 'force-dynamic';

export default async function AdminCommissionsPage() {
  // Récupérer toutes les données côté serveur
  const [settings, payouts, transactions] = await Promise.all([
    getCommissionSettings(),
    getOrganizerPayouts(),
    getRecentTransactions(20), // Récupérer les 20 dernières transactions
  ]);

  return (
    <AdminCommissionsPageClient
      initialSettings={settings}
      initialPayouts={payouts}
      initialTransactions={transactions}
    />
  );
}