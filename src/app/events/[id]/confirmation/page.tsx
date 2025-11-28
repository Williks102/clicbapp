import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Mail, Calendar, MapPin, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { firestore } from '@/lib/firebase-admin';
import type { Event, Sale } from '@/lib/types';
import { ResendTicketButton } from '@/components/resend-ticket-button';

type ConfirmationPageProps = {
  params: { id: string };
  searchParams: { saleId?: string; eventId?: string };
};

export default async function ConfirmationPage({
  params,
  searchParams,
}: ConfirmationPageProps) {
  const eventId = searchParams.eventId || params.id;
  const saleId = searchParams.saleId;

  if (!saleId) {
    notFound();
  }

  // Récupérer la vente
  const saleDoc = await firestore.collection('sales').doc(saleId).get();

  if (!saleDoc.exists) {
    notFound();
  }

  const sale = { id: saleDoc.id, ...saleDoc.data() } as Sale;

  // Récupérer l'événement
  const eventDoc = await firestore.collection('events').doc(sale.eventId).get();

  if (!eventDoc.exists) {
    notFound();
  }

  const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

  // Trouver le ticket
  const ticket = event.tickets.find(t => t.id === sale.ticketId);

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="container max-w-3xl py-12">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
        </div>
        <h1 className="mb-2 text-3xl font-bold">🎉 Achat Réussi !</h1>
        <p className="text-lg text-muted-foreground">
          Votre commande a été confirmée avec succès
        </p>
      </div>

      {/* Informations de la commande */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Détails de votre commande</CardTitle>
          <CardDescription>
            N° de commande : <span className="font-mono font-bold">{sale.id}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Ticket className="mt-1 h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{event.name}</p>
                <p className="text-sm text-muted-foreground">{ticket?.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium capitalize">{formattedDate}</p>
                <p className="text-sm text-muted-foreground">{formattedTime}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 text-primary" />
              <p className="font-medium">{event.location}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantité</span>
              <span className="font-medium">{sale.quantity} billet(s)</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total payé</span>
              <span className="text-primary">
                {sale.totalPrice.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions email */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Votre Billet Électronique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="mb-2 font-semibold text-green-800">
              ✅ Billet envoyé à votre email !
            </p>
            <p className="text-sm text-green-700">
              Un email de confirmation a été envoyé à{' '}
              <strong>{sale.customerEmail}</strong>
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">📧 Que faire ensuite ?</p>
            <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
              <li>Vérifiez votre boîte de réception (et vos spams)</li>
              <li>Ouvrez l'email contenant votre billet</li>
              <li>Présentez le QR code à l'entrée de l'événement</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <ResendTicketButton saleId={sale.id} email={sale.customerEmail} />
          </div>
        </CardContent>
      </Card>

      {/* Informations importantes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informations Importantes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span>⏰</span>
              <span>Arrivez 15 minutes avant le début de l'événement</span>
            </li>
            <li className="flex gap-2">
              <span>📱</span>
              <span>
                Présentez votre QR code sur votre téléphone ou imprimé
              </span>
            </li>
            <li className="flex gap-2">
              <span>🎫</span>
              <span>
                Ce billet est valable pour {sale.quantity} personne(s)
              </span>
            </li>
            <li className="flex gap-2">
              <span>💼</span>
              <span>
                Conservez votre email de confirmation en sécurité
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href="/account">Voir mes billets</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/events">Découvrir d'autres événements</Link>
        </Button>
      </div>
    </div>
  );
}