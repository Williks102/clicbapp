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
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Sale, Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminSalesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // Charger TOUTES les ventes depuis Firestore
  const salesQuery = useMemo(
    () => (firestore ? collection(firestore, 'sales') : null),
    [firestore]
  );
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);

  // Charger tous les événements
  const eventsQuery = useMemo(
    () => (firestore ? collection(firestore, 'events') : null),
    [firestore]
  );
  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(eventsQuery);

  const isLoading = isLoadingSales || isLoadingEvents;

  // Filtrer les ventes par date
  const filteredSales = useMemo(() => {
    if (!sales) return [];
    
    return sales.filter(sale => {
      const purchaseDate = new Date(sale.purchaseDate);
      if (!date?.from || !date?.to) return true;
      return purchaseDate >= date.from && purchaseDate <= date.to;
    });
  }, [sales, date]);

  // Calculer les statistiques
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  }, [filteredSales]);

  const totalTickets = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
  }, [filteredSales]);

  const getEventName = (eventId: string) => {
    return events?.find(e => e.id === eventId)?.name || 'Événement inconnu';
  };

  const handleExport = () => {
    if (!filteredSales.length) {
      toast({
        title: 'Aucune donnée à exporter',
        description: 'Il n\'y a pas de ventes pour la période sélectionnée.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['ID Commande', 'Client', 'Email', 'Événement', 'Quantité', 'Prix Total', 'Date'];
    const rows = filteredSales.map(sale => [
        sale.id,
        sale.customerName,
        sale.customerEmail,
        getEventName(sale.eventId),
        sale.quantity,
        sale.totalPrice,
        format(new Date(sale.purchaseDate), 'dd/MM/yyyy HH:mm')
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export-ventes-plateforme-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
        title: 'Exportation réussie',
        description: 'Le rapport des ventes a été téléchargé au format CSV.',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Toutes les Ventes"
          description="Consultez et exportez les données de ventes de toute la plateforme."
        />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Toutes les Ventes"
        description="Consultez et exportez les données de ventes de toute la plateforme."
      />

      {/* Statistiques globales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total des ventes</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {filteredSales.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Revenu total</CardDescription>
            <CardTitle className="text-3xl font-bold text-primary">
              {totalRevenue.toLocaleString('fr-FR')} FCFA
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Billets vendus</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {totalTickets}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Événements actifs</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {events?.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Rapport Global des Ventes</CardTitle>
              <CardDescription>
                Filtrez par période et exportez les données.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal sm:w-[300px]',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, 'LLL dd, y', { locale: fr })} -{' '}
                          {format(date.to, 'LLL dd, y', { locale: fr })}
                        </>
                      ) : (
                        format(date.from, 'LLL dd, y', { locale: fr })
                      )
                    ) : (
                      <span>Choisir une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={handleExport} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Événement</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Quantité</TableHead>
                  <TableHead className="text-right">Montant Total</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="font-medium">{sale.customerName}</div>
                      <div className="text-sm text-muted-foreground">{sale.customerEmail}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {getEventName(sale.eventId)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right">
                      {sale.quantity}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {sale.totalPrice.toLocaleString('fr-FR')} FCFA
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-muted-foreground">
                      {format(new Date(sale.purchaseDate), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>Voir les détails</DropdownMenuItem>
                          <DropdownMenuItem>Envoyer le billet</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                Aucune vente pour la période sélectionnée.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}