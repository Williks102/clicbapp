'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Ticket, Wallet, Activity, TrendingUp } from 'lucide-react';
import EventRecommendations from '@/components/event-recommendations';
import { getOrganizerStats, type OrganizerStats } from '@/app/actions/stats-actions';
import { Skeleton } from '@/components/ui/skeleton';

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: string;
  description?: string;
  icon: React.ElementType;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-3/4" />
          {description && <Skeleton className="mt-2 h-4 w-1/2" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}


export default function DashboardPage() {
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getOrganizerStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch organizer stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tableau de Bord"
        description="Bienvenue, voici un aperçu de vos activités."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenu Total"
          value={stats ? `${stats.totalRevenue.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
          description={stats ? `Sur ${stats.totalSales} ventes` : ''}
          icon={Wallet}
          isLoading={isLoading}
        />
        <StatCard
          title="Billets Vendus"
          value={stats ? `${stats.totalTicketsSold}` : '0'}
          description="Total de billets distribués"
          icon={Ticket}
          isLoading={isLoading}
        />
        <StatCard
          title="Total des Ventes"
          value={stats ? `${stats.totalSales}` : '0'}
          description="Nombre de commandes"
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <StatCard
          title="Événements Créés"
          value={stats ? `${stats.totalEvents}` : '0'}
          description="Total de vos événements"
          icon={Activity}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">
            Recommandations d'Événements
          </CardTitle>
          <CardDescription>
            Suggestions d'opportunités basées sur vos préférences et le marché
            actuel, générées par l'IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventRecommendations />
        </CardContent>
      </Card>
    </div>
  );
}
