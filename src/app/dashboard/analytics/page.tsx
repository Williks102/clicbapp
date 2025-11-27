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
import { Skeleton } from '@/components/ui/skeleton';
import { getOrganizerStats, type OrganizerStats } from '@/app/actions/stats-actions';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Ticket, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DashboardAnalyticsPage() {
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      const data = await getOrganizerStats();
      setStats(data);
      setIsLoading(false);
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Statistiques"
          description="Analysez les performances de vos événements."
        />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Statistiques"
          description="Analysez les performances de vos événements."
        />
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Impossible de charger les statistiques.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Statistiques"
        description="Analysez les performances de vos événements."
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRevenue.toLocaleString('fr-FR')} FCFA
            </div>
            <p className="text-xs text-muted-foreground">
              Sur {stats.totalSales} ventes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billets Vendus</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTicketsSold}</div>
            <p className="text-xs text-muted-foreground">
              Total de billets distribués
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Nombre de commandes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Événements</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Total d'événements créés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique des ventes par mois */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventes par Mois</CardTitle>
            <CardDescription>Évolution du nombre de ventes sur 6 mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#FF9500" 
                  strokeWidth={2}
                  name="Ventes"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenu par Mois</CardTitle>
            <CardDescription>Évolution des revenus sur 6 mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`}
                />
                <Legend />
                <Bar 
                  dataKey="revenue" 
                  fill="#007AFF" 
                  name="Revenu (FCFA)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top événements */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Événements</CardTitle>
          <CardDescription>Vos événements les plus performants</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topEvents.length > 0 ? (
            <div className="space-y-4">
              {stats.topEvents.map((event, index) => (
                <div 
                  key={event.eventId}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{event.eventName}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.sales} vente{event.sales > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      {event.revenue.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucune vente pour le moment
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ventes récentes */}
      <Card>
        <CardHeader>
          <CardTitle>Ventes Récentes</CardTitle>
          <CardDescription>Les 10 dernières commandes</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentSales.length > 0 ? (
            <div className="space-y-3">
              {stats.recentSales.map((sale) => (
                <div 
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{sale.customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {sale.quantity} billet{sale.quantity > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {sale.totalPrice.toLocaleString('fr-FR')} FCFA
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sale.purchaseDate), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucune vente pour le moment
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}