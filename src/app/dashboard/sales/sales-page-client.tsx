'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, Download } from 'lucide-react';
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
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/hooks/use-toast';
import type { Sale, Event } from '@/lib/types';

interface SalesPageClientProps {
  initialSales: Sale[];
  initialEvents: Event[];
}

export default function SalesPageClient({ initialSales, initialEvents }: SalesPageClientProps) {
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

  // Calculer le total
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
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

    // Créer le CSV
    const headers = ['Date', 'Événement', 'Client', 'Quantité', 'Montant'];
    const rows = filteredSales.map(sale => [
      format(new Date(sale.purchaseDate), 'dd/MM/yyyy', { locale: fr }),
      getEventName(sale.eventId),
      sale.customerName,
      sale.quantity.toString(),
      `${sale.totalPrice.toLocaleString('fr-FR')} F CFA`
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
    link.setAttribute('download', `ventes-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export réussi',
      description: 'Le fichier CSV a été téléchargé avec succès.'
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes Ventes"
        description="Suivi de vos ventes de billets et revenus."
      />

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

      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
          <CardDescription>
            Période sélectionnée : {filteredSales.length} vente(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalRevenue.toLocaleString('fr-FR')} F CFA
          </div>
          <p className="text-xs text-muted-foreground">
            Chiffre d'affaires total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détail des Ventes</CardTitle>
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
                    <TableHead>Billets</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {format(new Date(sale.purchaseDate), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>{getEventName(sale.eventId)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sale.customerName}</p>
                          <p className="text-sm text-muted-foreground">
                            {sale.customerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{sale.quantity}</TableCell>
                      <TableCell className="text-right font-medium">
                        {sale.totalPrice.toLocaleString('fr-FR')} F CFA
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