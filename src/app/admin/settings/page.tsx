
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, AlertTriangle } from 'lucide-react';

export default function AdminSettingsPage() {
  const [isInitializingCategories, setIsInitializingCategories] = useState(false);
  const merchantId = process.env.NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID;

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
            Vérification de la configuration pour la passerelle "Paiement Pro".
          </CardDescription>
        </CardHeader>
        <CardContent>
          {merchantId ? (
            <Alert variant="default" className="border-green-500 bg-green-50 text-green-800">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Configuration Détectée</AlertTitle>
              <AlertDescription>
                <p>L'ID Marchand suivant est configuré pour l'application :</p>
                <code className="mt-2 block rounded bg-green-100 p-2 font-mono text-sm">{merchantId}</code>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Action requise : ID Marchand manquant</AlertTitle>
              <AlertDescription>
                <p>La variable d'environnement <code className="font-mono text-xs">NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID</code> n'est pas définie.</p>
                <p className="mt-2">Le paiement ne fonctionnera pas sans cette configuration. Veuillez l'ajouter dans les paramètres de votre plateforme d'hébergement.</p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <p className="text-sm text-muted-foreground">Cette valeur est lue depuis les variables d'environnement et ne peut pas être modifiée ici.</p>
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
          <Button disabled>Enregistrer les informations</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
