
'use client';

import { useState } from 'react';
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
import { sales, events } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

export default function SalesPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const { toast } = useToast();
  
  const filteredSales = sales.filter(sale => {
    const purchaseDate = new Date(sale.purchaseDate);
    if (!date?.from || !date?.to) return true;
    return purchaseDate >= date.from && purchaseDate <= date.to;
  });

  const getEventName = (eventId: string) => {
    return events.find(e => e.id === eventId)?.name || 'Événement inconnu';
  };

  const handleExport = () => {
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
    link.setAttribute("download", `export-ventes-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
        title: 'Exportation réussie',
        description: 'Le rapport des ventes a été téléchargé au format CSV.',
    });
  };


  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestion des Ventes"
        description="Consultez et exportez les données de vos ventes."
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Rapport des Ventes</CardTitle>
              <CardDescription>
                Filtrez par période et exportez les données.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={'outline'}
                    className={cn(
                      'w-[300px] justify-start text-left font-normal',
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
              <Button onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Événement</TableHead>
                <TableHead className="text-right">Montant Total</TableHead>
                <TableHead className="text-right">Date d'achat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="font-medium">{sale.customerName}</div>
                      <div className="text-sm text-muted-foreground">
                        {sale.customerEmail}
                      </div>
                    </TableCell>
                    <TableCell>{getEventName(sale.eventId)}</TableCell>
                    <TableCell className="text-right">
                      {sale.totalPrice.toLocaleString('fr-FR')} FCFA
                    </TableCell>
                    <TableCell className="text-right">
                      {format(new Date(sale.purchaseDate), 'PPpp', { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center"
                  >
                    Aucune vente pour la période sélectionnée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}