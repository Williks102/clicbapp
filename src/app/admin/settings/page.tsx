
'use client';

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
import { initializeCategories } from '@/app/actions/category-actions';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';

export default function AdminSettingsPage() {
  const [isInitializingCategories, setIsInitializingCategories] = useState(false);

  const handleInitializeCategories = async () => {
    setIsInitializingCategories(true);
    try {
      const result = await initializeCategories();
      toast({
        title: result.success ? 'Succès' : 'Erreur',
        description: result.message,
        variant: result.success ? 'default' : 'destructive'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive'
      });
    } finally {
      setIsInitializingCategories(false);
    }
  };
  return (
    <div className="space-y-8">
      <PageHeader
        title="Paramètres de la Plateforme"
        description="Gérez les paramètres globaux de ClicBillet."
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Catégories d'événements</CardTitle>
          <CardDescription>
            Initialisez les catégories par défaut pour les événements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Cliquez sur le bouton ci-dessous pour créer les catégories par défaut si elles n'existent pas encore.
            Les catégories incluent: Concert, Festival, Théâtre, Conférence, Sport, Exposition, Formation, Autre.
          </p>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button
            onClick={handleInitializeCategories}
            disabled={isInitializingCategories}
          >
            {isInitializingCategories ? 'Initialisation...' : 'Initialiser les catégories'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Passerelle de Paiement</CardTitle>
          <CardDescription>
            Configurez la passerelle de paiement professionnelle (Paiement Pro) pour la plateforme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h3 className="font-semibold">Activer la passerelle de paiement</h3>
              <p className="text-sm text-muted-foreground">
                Permet d'accepter les paiements réels via Mobile Money et carte.
              </p>
            </div>
            <Switch id="payment-gateway-enabled" defaultChecked disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="merchant-id">ID Marchand (Paiement Pro)</Label>
            <Input id="merchant-id" value="PP-F1765" disabled />
            <p className="text-xs text-muted-foreground">
              Cette valeur est stockée dans la variable d'environnement `NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID` et est correctement configurée.
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button disabled>Configuration Enregistrée</Button>
        </CardFooter>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle className="font-headline">Informations sur l'entreprise</CardTitle>
           <CardDescription>
            Ces informations peuvent être utilisées dans les factures et les communications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nom de l'entreprise</Label>
            <Input id="company-name" defaultValue="ClicBillet SAS" />
          </div>
           <div className="space-y-2">
            <Label htmlFor="company-address">Adresse</Label>
            <Input id="company-address" defaultValue="Abidjan, Côte d'Ivoire" />
          </div>
        </CardContent>
         <CardFooter className="border-t px-6 py-4">
          <Button>Enregistrer les informations</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
