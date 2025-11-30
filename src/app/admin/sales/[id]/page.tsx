import { getAdminSaleDetails } from '@/app/actions/sale-details-actions';
import { notFound } from 'next/navigation';
import AdminSaleDetailsClient from './admin-sale-details-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function AdminSaleDetailsPage({ params }: PageProps) {
  const saleDetails = await getAdminSaleDetails(params.id);

  if (!saleDetails) {
    notFound();
  }

  return <AdminSaleDetailsClient saleDetails={saleDetails} />;
}