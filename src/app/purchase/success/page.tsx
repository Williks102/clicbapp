import { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle, Mail, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

function SuccessContent({ 
  searchParams 
}: { 
  searchParams: { orderId?: string } 
}) {
  const orderId = searchParams.orderId || 'UNKNOWN';

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Achat confirmé !</CardTitle>
          <CardDescription>
            Commande #{orderId}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Votre billet a été envoyé par email. Vérifiez votre boîte de réception 
              et vos spams si vous ne le voyez pas dans les prochaines minutes.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold">Prochaines étapes :</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>1. Vérifiez votre email pour recevoir votre billet électronique</li>
                <li>2. Téléchargez ou imprimez votre billet avec le QR code</li>
                <li>3. Présentez le QR code à l'entrée de l'événement</li>
              </ol>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">Besoin d'aide ?</p>
              <p className="text-sm text-muted-foreground">
                Si vous avez des questions ou si vous ne recevez pas votre billet, 
                contactez notre support à : support@clicbillet.ci
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" className="flex-1" asChild>
              <Link href="/events">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voir d'autres événements
              </Link>
            </Button>
            <Button className="flex-1" asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Chargement...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  );
}