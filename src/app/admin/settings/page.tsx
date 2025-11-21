
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Paramètres de la Plateforme"
        description="Gérez les paramètres globaux de ClicBillet."
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Passerelles de Paiement</CardTitle>
          <CardDescription>
            Configurez les options de paiement disponibles pour tous les organisateurs.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
                <CardTitle className='text-base'>Mobile Money</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="om" defaultChecked />
                <Label htmlFor="om">Activer Orange Money</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="momo" defaultChecked />
                <Label htmlFor="momo">Activer MTN Mobile Money</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="wave" defaultChecked />
                <Label htmlFor="wave">Activer Wave</Label>
              </div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
                <CardTitle className='text-base'>Cartes Bancaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="stripe" />
                <Label htmlFor="stripe">Activer Stripe (Visa, Mastercard)</Label>
              </div>
               <div className="flex items-center space-x-2">
                <Checkbox id="paypal" />
                <Label htmlFor="paypal">Activer PayPal</Label>
              </div>
            </CardContent>
          </Card>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button>Enregistrer les modifications</Button>
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
