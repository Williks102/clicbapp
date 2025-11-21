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
import { Separator } from '@/components/ui/separator';

export default function BuyerProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Mon Profil"
        description="Gérez vos informations personnelles et vos paramètres de compte."
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Informations Personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Nom et Prénoms</Label>
            <Input id="full-name" defaultValue="Aisha Koné" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Adresse E-mail</Label>
            <Input id="email" type="email" defaultValue="aisha.kone@example.com" />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button>Enregistrer les modifications</Button>
        </CardFooter>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle className="font-headline">Changer de mot de passe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input id="current-password" type="password" />
          </div>
           <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input id="new-password" type="password" />
          </div>
           <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
            <Input id="confirm-password" type="password" />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button>Mettre à jour le mot de passe</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
