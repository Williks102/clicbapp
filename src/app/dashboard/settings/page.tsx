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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Paramètres du Compte"
        description="Gérez les informations de votre compte."
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Informations de Connexion</CardTitle>
          <CardDescription>
            Modifiez votre adresse e-mail et votre mot de passe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Adresse E-mail</Label>
            <Input id="email" type="email" defaultValue="contact@livenation-ivoire.com" />
          </div>
          <Separator />
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
       <Card>
        <CardHeader>
          <CardTitle className="font-headline">Notifications</CardTitle>
          <CardDescription>
            Choisissez comment vous souhaitez recevoir les notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="email-notifications" defaultChecked />
              <Label htmlFor="email-notifications">Recevoir les notifications par e-mail pour les ventes de billets.</Label>
            </div>
             <div className="flex items-center space-x-2">
              <Checkbox id="platform-updates" />
              <Label htmlFor="platform-updates">Recevoir les mises à jour et les nouveautés de la plateforme.</Label>
            </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button>Enregistrer les préférences</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
