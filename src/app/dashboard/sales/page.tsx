import { getOrganizerSales, getEventsForSales } from '@/app/actions/sales-actions';
import SalesPageClient from './sales-page-client';

export const dynamic = 'force-dynamic';

export default async function SalesPage() {
  // Récupérer les données côté serveur
  const [sales, events] = await Promise.all([
    getOrganizerSales(),
    getEventsForSales()
  ]);

  return <SalesPageClient initialSales={sales} initialEvents={events} />;
}