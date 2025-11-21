
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Download, MoreHorizontal } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { sales, users } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

type PayoutStatus = 'pending' | 'paid';

type OrganizerPayout = {
  organizerId: string;
  organizerName: string;
  totalRevenue: number;
  platformCommission: number;
  netPayout: number;
  status: PayoutStatus;
};

export default function AdminCommissionsPage() {
  const { toast } = useToast();
  const [platformFee, setPlatformFee] = useState(5);
  const [transactionFee, setTransactionFee] = useState(2.5);
  
  const totalFee = platformFee + transactionFee;
  const organizerUsers = users.filter(u => u.role === 'organizer');

  // Calculate payouts per organizer
  const initialPayouts: OrganizerPayout[] = organizerUsers.map(organizer => {
    const orgSales = sales.filter(s => s.organizerId === organizer.id);
    const totalRevenue = orgSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const platformCommission = totalRevenue * (platformFee / 100);
    const netPayout = totalRevenue - (totalRevenue * (totalFee / 100));

    return {
      organizerId: organizer.id,
      organizerName: organizer.name,
      totalRevenue,
      platformCommission,
      netPayout,
      status: totalRevenue > 500000 ? 'pending' : 'paid', // Mock status
    };
  });

  const [payouts, setPayouts] = useState<OrganizerPayout[]>(initialPayouts);

  const handleMarkAsPaid = (organizerId: string) => {
    setPayouts(payouts.map(p => p.organizerId === organizerId ? { ...p, status: 'paid' } : p));
    toast({
        title: 'Paiement enregistré',
        description: `Le versement pour ${payouts.find(p=>p.organizerId === organizerId)?.organizerName} a été marqué comme payé.`
    });
  };
  
  const handleExport = () => {
    const headers = ['Organisateur', 'Chiffre d\'affaires brut', 'Commission Plateforme', 'Montant à verser', 'Statut'];
    const rows = payouts.map(p => [
        p.organizerName.replace(/,/g, ''),
        p.totalRevenue,
        p.platformCommission,
        p.netPayout,
        p.status === 'paid' ? 'Payé' : 'En attente'
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export-commissions-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
        title: 'Exportation réussie',
        description: 'Le rapport des commissions a été téléchargé.',
    });
  };


  return (
    <div className="space-y-8">
      <PageHeader
        title="Commissions et Paiements"
        description="Paramétrez les frais et gérez les paiements des organisateurs."
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Paramétrage des Frais</CardTitle>
          <CardDescription>
            Ces frais s'appliquent à chaque billet vendu sur la plateforme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="percentage-platform">
                Commission Plateforme ClicBillet (%)
              </Label>
              <Input
                  id="percentage-platform"
                  type="number"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(parseFloat(e.target.value) || 0)}
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="percentage-payment">
                Frais de Transaction (Mobile Money, etc.) (%)
              </Label>
               <Input
                  id="percentage-payment"
                  type="number"
                  value={transactionFee}
                  onChange={(e) => setTransactionFee(parseFloat(e.target.value) || 0)}
                />
            </div>
          </div>
          <div className="rounded-md border border-dashed border-primary/50 bg-primary/5 p-4">
            <p className="text-sm font-semibold">
              Total Frais de Service par défaut: {totalFee.toFixed(2)}%
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button>Enregistrer les modifications</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle className="font-headline">Suivi des Paiements</CardTitle>
                <CardDescription>
                    Gérez les versements aux organisateurs.
                </CardDescription>
            </div>
             <Button onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exporter le rapport
              </Button>
          </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Organisateur</TableHead>
                        <TableHead className='hidden md:table-cell text-right'>CA Brut</TableHead>
                        <TableHead className='hidden lg:table-cell text-right'>Commission</TableHead>
                        <TableHead className='text-right'>Net à verser</TableHead>
                        <TableHead className='text-center'>Statut</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payouts.map((payout) => (
                        <TableRow key={payout.organizerId}>
                            <TableCell className='font-medium'>{payout.organizerName}</TableCell>
                            <TableCell className='hidden md:table-cell text-right'>{payout.totalRevenue.toLocaleString('fr-FR')} FCFA</TableCell>
                            <TableCell className='hidden lg:table-cell text-right text-primary font-semibold'>{payout.platformCommission.toLocaleString('fr-FR')} FCFA</TableCell>
                            <TableCell className='text-right font-bold'>{payout.netPayout.toLocaleString('fr-FR')} FCFA</TableCell>
                            <TableCell className='text-center'>
                                <Badge variant={payout.status === 'paid' ? 'default' : 'secondary'} className={payout.status === 'paid' ? 'bg-green-500' : 'bg-yellow-400 text-black'}>
                                    {payout.status === 'paid' ? 'Payé' : 'En attente'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                    aria-haspopup="true"
                                    size="icon"
                                    variant="ghost"
                                    >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleMarkAsPaid(payout.organizerId)} disabled={payout.status === 'paid'}>
                                        Marquer comme payé
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        Voir le détail des ventes
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
