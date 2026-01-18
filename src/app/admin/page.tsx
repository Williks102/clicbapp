
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, Wallet, Users, Building2, BarChart3 } from 'lucide-react';
import { getAdminStats } from '@/app/actions/stats-actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  if (!stats) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Dashboard Administrateur"
          description="Vue d'ensemble de la plateforme."
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Impossible de charger les statistiques.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Dashboard Administrateur"
          description="Vue d'ensemble de la plateforme."
        />
        <Button variant="outline" asChild>
          <Link href="/admin/analytics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Voir les détails
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Totals</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRevenue.toLocaleString('fr-FR')} FCFA
            </div>
            <p className="text-xs text-muted-foreground">
              Chiffre d'affaires brut sur la plateforme
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billets Vendus</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTicketsSold.toLocaleString('fr-FR')}</div>
            <p className="text-xs text-muted-foreground">
              Sur {stats.totalSales.toLocaleString('fr-FR')} commandes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Organisateurs
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrganizers}</div>
            <p className="text-xs text-muted-foreground">
              Organisateurs inscrits
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Clients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Clients inscrits
            </p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
