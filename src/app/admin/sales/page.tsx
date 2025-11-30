import { getAdminSales, getEventsForSales } from '@/app/actions/sales-actions';
import AdminSalesPageClient from './admin-sales-page-client';

export const dynamic = 'force-dynamic';

export default async function AdminSalesPage() {
  // Récupérer toutes les données côté serveur
  const [sales, events] = await Promise.all([
    getAdminSales(),
    getEventsForSales()
  ]);

  return <AdminSalesPageClient initialSales={sales} initialEvents={events} />;
}