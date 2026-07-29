'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, MoreHorizontal, TrendingUp, Wallet, Users, DollarSign } from 'lucide-react';

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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  updateCommissionSettings, 
  fundOrganizer,
  type CommissionSettings,
  type OrganizerPayout,
  type Transaction
} from '@/app/actions/commission-actions';
import { Separator } from '@/components/ui/separator';

interface AdminCommissionsPageClientProps {
  initialSettings: CommissionSettings;
  initialPayouts: OrganizerPayout[];
  initialTransactions: Transaction[];
}

export default function AdminCommissionsPageClient({
  initialSettings,
  initialPayouts,
  initialTransactions,
}: AdminCommissionsPageClientProps) {
  const { toast } = useToast();
  
  const [platformFee, setPlatformFee] = useState(initialSettings.platformFeePercentage);
  const [transactionFee, setTransactionFee] = useState(initialSettings.transactionFeePercentage);
  const [payouts] = useState(initialPayouts);
  const [transactions] = useState(initialTransactions);
  const [isSaving, setIsSaving] = useState(false);
  
  // Dialog pour le paiement
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<OrganizerPayout | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const totalFee = platformFee + transactionFee;

  // Statistiques globales
  const totalRevenue = payouts.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalCommissions = payouts.reduce((sum, p) => sum + p.platformCommission, 0);
  const totalTransactionFees = payouts.reduce((sum, p) => sum + p.transactionFees, 0);
  const totalNetPayouts = payouts.reduce((sum, p) => sum + p.netPayout, 0);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const result = await updateCommissionSettings(platformFee, transactionFee);
      
      if (result.success) {
        toast({
          title: 'Paramètres enregistrés',
          description: 'Les nouveaux taux de commission ont été appliqués.',
        });
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de sauvegarder les paramètres',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPaymentDialog = (payout: OrganizerPayout) => {
    setSelectedPayout(payout);
    setPaymentDialog(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedPayout) return;

    setIsProcessing(true);
    try {
      const result = await fundOrganizer(
        selectedPayout.organizerId,
        selectedPayout.netPayout
      );

      if (result.success) {
        toast({
          title: 'Paiement effectué',
          description: `Le versement de ${selectedPayout.netPayout.toLocaleString('fr-FR')} F CFA à ${selectedPayout.organizerName} a été enregistré.`,
        });
        setPaymentDialog(false);
        setSelectedPayout(null);
        // Recharger la page pour actualiser les données
        window.location.reload();
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de traiter le paiement',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du paiement',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    const headers = [
      'Organisateur',
      'Email',
      'CA Brut',
      'Commission Plateforme',
      'Frais Transaction',
      'Net à verser',
      'Nb Commandes'
    ];
    
    const rows = payouts.map(p => [
      p.organizerName.replace(/,/g, ' '),
      p.organizerEmail,
      p.totalRevenue.toString(),
      p.platformCommission.toString(),
      p.transactionFees.toString(),
      p.netPayout.toString(),
      p.ordersCount.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `commissions-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export réussi',
      description: 'Le rapport des commissions a été téléchargé.',
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Commissions et Paiements"
        description="Gérez les paramètres de commission et les paiements aux organisateurs."
      />

      {/* Statistiques globales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              CA Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRevenue.toLocaleString('fr-FR')} F CFA
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Chiffre d'affaires brut total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {totalCommissions.toLocaleString('fr-FR')} F CFA
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total des commissions plateforme
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Frais Transaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTransactionFees.toLocaleString('fr-FR')} F CFA
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total des frais de paiement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Net Organisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalNetPayouts.toLocaleString('fr-FR')} F CFA
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total à verser aux organisateurs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Paramétrage des frais */}
      <Card>
        <CardHeader>
          <CardTitle>Paramétrage des Frais</CardTitle>
          <CardDescription>
            Ces frais s'appliquent à chaque commande payée sur la plateforme (packs de votes et accès aux directs).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="percentage-platform">
                Commission Plateforme ClicVote (%)
              </Label>
              <Input
                id="percentage-platform"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={platformFee}
                onChange={(e) => setPlatformFee(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="percentage-payment">
                Frais de Transaction / Paiement (%)
              </Label>
              <Input
                id="percentage-payment"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={transactionFee}
                onChange={(e) => setTransactionFee(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="rounded-md border border-dashed border-primary/50 bg-primary/5 p-4">
            <p className="text-sm font-semibold">
              Total Frais de Service par défaut: {totalFee.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Les organisateurs recevront {(100 - totalFee).toFixed(2)}% du montant de chaque commande payée
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </CardFooter>
      </Card>

      {/* Suivi des paiements */}
      <Card>
        <CardHeader>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Suivi des Paiements par Organisateur</CardTitle>
              <CardDescription>
                Gérez les versements aux organisateurs ({payouts.length} organisateurs)
              </CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exporter le rapport
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                Aucun organisateur avec des commandes pour le moment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisateur</TableHead>
                    <TableHead className="hidden md:table-cell text-right">CA Brut</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Commission</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Frais</TableHead>
                    <TableHead className="text-right">Net à verser</TableHead>
                    <TableHead className="text-center">Commandes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.organizerId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payout.organizerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {payout.organizerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right">
                        {payout.totalRevenue.toLocaleString('fr-FR')} F
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-primary font-semibold">
                        {payout.platformCommission.toLocaleString('fr-FR')} F
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right">
                        {payout.transactionFees.toLocaleString('fr-FR')} F
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {payout.netPayout.toLocaleString('fr-FR')} F CFA
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {payout.ordersCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Ouvrir le menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleOpenPaymentDialog(payout)}
                            >
                              Effectuer le versement
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => window.location.href = `/admin/users/${payout.organizerId}`}
                            >
                              Voir le profil
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

      {/* Dernières transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Dernières Transactions</CardTitle>
          <CardDescription>
            Historique des {transactions.length} dernières transactions de commission
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Aucune transaction pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.date), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        transaction.type === 'commission' ? 'default' :
                        transaction.type === 'payout' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {transaction.type === 'commission' ? 'Commission' :
                       transaction.type === 'payout' ? 'Versement' :
                       'Remboursement'}
                    </Badge>
                    <p className="text-sm font-bold min-w-[120px] text-right">
                      {transaction.amount > 0 ? '+' : ''}
                      {transaction.amount.toLocaleString('fr-FR')} F CFA
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmation de paiement */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le versement</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point d'effectuer un versement à un organisateur.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayout && (
            <div className="space-y-4 py-4">
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Organisateur:</span>
                  <span className="font-medium">{selectedPayout.organizerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="font-medium text-sm">{selectedPayout.organizerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">CA Brut:</span>
                  <span className="font-medium">
                    {selectedPayout.totalRevenue.toLocaleString('fr-FR')} F CFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Commission:</span>
                  <span className="font-medium text-destructive">
                    -{selectedPayout.platformCommission.toLocaleString('fr-FR')} F CFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Frais transaction:</span>
                  <span className="font-medium text-destructive">
                    -{selectedPayout.transactionFees.toLocaleString('fr-FR')} F CFA
                  </span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                <span className="font-semibold">Montant à verser:</span>
                <span className="text-2xl font-bold text-primary">
                  {selectedPayout.netPayout.toLocaleString('fr-FR')} F CFA
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialog(false)}
              disabled={isProcessing}
            >
              Annuler
            </Button>
            <Button
              onClick={handleProcessPayment}
              disabled={isProcessing}
            >
              {isProcessing ? 'Traitement...' : 'Confirmer le versement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}