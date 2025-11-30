'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, Download, MoreHorizontal } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/hooks/use-toast';
import type { Sale, Event } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface AdminSalesPageClientProps {
  initialSales: Sale[];
  initialEvents: Event[];
}

export default function AdminSalesPageClient({ 
  initialSales, 
  initialEvents 
}: AdminSalesPageClientProps) {
  const { toast } = useToast();
  const [sales] = useState(initialSales);
  const [events] = useState(initialEvents);
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // Filtrer les ventes par date
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const purchaseDate = new Date(sale.purchaseDate);
      if (!date?.from || !date?.to) return true;
      return purchaseDate >= date.from && purchaseDate <= date.to;
    });
  }, [sales, date]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const totalTickets = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
    
    // Grouper par organisateur
    const byOrganizer = filteredSales.reduce((acc, sale) => {
      if (!acc[sale.organizerId]) {
        acc[sale.organizerId] = { revenue: 0, count: 0 };
      }
      acc[sale.organizerId].revenue += sale.totalPrice;
      acc[sale.organizerId].count += 1;
      return acc;
    }, {} as Record<string, { revenue: number; count: number }>);
    
    const totalOrganizers = Object.keys(byOrganizer).length;

    return {
      totalRevenue,
      totalTickets,
      totalSales: filteredSales.length,
      totalOrganizers
    };
  }, [filteredSales]);

  const getEventName = (eventId: string) => {
    return events?.find(e => e.id === eventId)?.name || 'Événement inconnu';
  };

  const handleExport = () => {
    if (!filteredSales.length) {
      toast({
        title: 'Aucune donnée à exporter',
        description: 'Il n\'y a pas de ventes pour la période sélectionnée.',
        variant: 'destructive'
      });
      return;
    }

    // Créer le CSV avec plus de colonnes pour l'admin
    const headers = ['Date', 'Événement', 'Client', 'Email', 'Quantité', 'Montant', 'Organisateur'];
    const rows = filteredSales.map(sale => [
      format(new Date(sale.purchaseDate), 'dd/MM/yyyy HH:mm', { locale: fr }),
      getEventName(sale.eventId),
      sale.customerName,
      sale.customerEmail,
      sale.quantity.toString(),
      `${sale.totalPrice.toLocaleString('fr-FR')} F CFA`,
      sale.organizerId
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Télécharger le fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ventes-admin-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export réussi',
      description: 'Le fichier CSV a été téléchargé avec succès.'
    });
  };

  const handleViewDetails = (sale: Sale) => {
    // TODO: Implémenter la vue détaillée ou redirection
    toast({
      title: 'Détails de la vente',
      description: `Vente #${sale.id} - ${sale.customerName}`
    });
  };

  const handleRefund = (sale: Sale) => {
    // TODO: Implémenter le remboursement
    toast({
      title: 'Remboursement',
      description: 'Fonctionnalité à implémenter',
      variant: 'destructive'
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestion des Ventes"
        description="Vue globale de toutes les ventes sur la plateforme."
      />

      {/* Filtres et actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "dd MMM", { locale: fr })} -{" "}
                      {format(date.to, "dd MMM yyyy", { locale: fr })}
                    </>
                  ) : (
                    format(date.from, "dd MMM yyyy", { locale: fr })
                  )
                ) : (
                  <span>Sélectionner une période</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button onClick={handleExport} size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Chiffre d'affaires total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRevenue.toLocaleString('fr-FR')} F CFA
            </div>
            <p className="text-xs text-muted-foreground">
              Pour la période sélectionnée
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total des ventes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTickets} billets vendus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Organisateurs actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrganizers}</div>
            <p className="text-xs text-muted-foreground">
              Avec des ventes cette période
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Ticket moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSales > 0 
                ? Math.round(stats.totalRevenue / stats.totalTickets).toLocaleString('fr-FR')
                : 0} F CFA
            </div>
            <p className="text-xs text-muted-foreground">
              Prix moyen par billet
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des ventes */}
      <Card>
        <CardHeader>
          <CardTitle>Détail des Ventes</CardTitle>
          <CardDescription>
            {filteredSales.length} vente(s) pour la période sélectionnée
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                Aucune vente pour la période sélectionnée.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Événement</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Billets</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="whitespace-nowrap">
                        <div>
                          <p className="font-medium">
                            {format(new Date(sale.purchaseDate), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(sale.purchaseDate), 'HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getEventName(sale.eventId)}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {sale.eventId.slice(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{sale.customerName}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{sale.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {sale.quantity} {sale.quantity > 1 ? 'billets' : 'billet'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {sale.totalPrice.toLocaleString('fr-FR')} F CFA
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                            >
                              <span className="sr-only">Ouvrir le menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleViewDetails(sale)}
                            >
                              Voir les détails
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRefund(sale)}
                              className="text-destructive"
                            >
                              Rembourser
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}