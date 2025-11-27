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
import { getAdminStats, type AdminStats } from '@/app/actions/stats-actions';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Ticket, Calendar, Users, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#FF9500', '#007AFF', '#34C759', '#FF3B30', '#AF52DE'];

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      const data = await getAdminStats();
      setStats(data);
      setIsLoading(false);
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Statistiques Globales"
          description="Vue d'ensemble de la plateforme."
        />
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
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
          title="Statistiques Globales"
          description="Vue d'ensemble de la plateforme."
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
        title="Statistiques Globales"
        description="Vue d'ensemble de la plateforme ClicBillet."
      />

      {/* KPIs Globaux */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.totalRevenue / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">FCFA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billets Vendus</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTicketsSold}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">Commandes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Événements</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organisateurs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrganizers}</div>
            <p className="text-xs text-muted-foreground">Inscrits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques principaux */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventes Mensuelles</CardTitle>
            <CardDescription>Évolution des ventes sur 6 mois</CardDescription>
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
                  name="Nombre de ventes"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenus Mensuels</CardTitle>
            <CardDescription>Évolution des revenus sur 6 mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `${(value / 1000).toFixed(0)}K FCFA`}
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

      {/* Top événements et organisateurs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Événements</CardTitle>
            <CardDescription>Événements les plus performants</CardDescription>
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
                      <div 
                        className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-white"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      >
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
                        {(event.revenue / 1000).toFixed(0)}K
                      </p>
                      <p className="text-xs text-muted-foreground">FCFA</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Organisateurs</CardTitle>
            <CardDescription>Organisateurs les plus performants</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topOrganizers.length > 0 ? (
              <div className="space-y-4">
                {stats.topOrganizers.map((organizer, index) => (
                  <div 
                    key={organizer.organizerId}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-white"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      >
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{organizer.organizerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {organizer.sales} vente{organizer.sales > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {(organizer.revenue / 1000).toFixed(0)}K
                      </p>
                      <p className="text-xs text-muted-foreground">FCFA</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aucun organisateur pour le moment
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ventes récentes */}
      <Card>
        <CardHeader>
          <CardTitle>Ventes Récentes</CardTitle>
          <CardDescription>Les 10 dernières commandes sur la plateforme</CardDescription>
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
                      {sale.customerEmail}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
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