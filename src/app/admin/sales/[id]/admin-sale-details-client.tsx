'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Calendar, MapPin, User, Mail, Phone, CreditCard, FileText, Package, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/page-header';
import type { SaleDetails } from '@/app/actions/sale-details-actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AdminSaleDetailsClientProps {
  saleDetails: SaleDetails;
}

export default function AdminSaleDetailsClient({ saleDetails }: AdminSaleDetailsClientProps) {
  const router = useRouter();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8">
      {/* Header avec bouton retour */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/sales')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <PageHeader
              title={`Commande #${saleDetails.id.slice(0, 8).toUpperCase()}`}
              description={`Effectuée le ${format(new Date(saleDetails.purchaseDate), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}`}
            />
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          {saleDetails.quantity} {saleDetails.quantity > 1 ? 'billets' : 'billet'}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations de l'événement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Événement
            </CardTitle>
            <CardDescription>Détails de l'événement concerné</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {saleDetails.event ? (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nom de l'événement</p>
                  <p className="text-lg font-semibold">{saleDetails.event.name}</p>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Date et heure</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p>{format(new Date(saleDetails.event.date), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Lieu</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p>{saleDetails.event.location}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Catégorie</p>
                  <Badge variant="outline" className="mt-1">
                    {saleDetails.event.category}
                  </Badge>
                </div>

                {saleDetails.event.image && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Visuel</p>
                      <img
                        src={saleDetails.event.image}
                        alt={saleDetails.event.name}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Événement non disponible</p>
                <p className="text-sm text-muted-foreground mt-1">ID: {saleDetails.eventId}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informations du client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Client
            </CardTitle>
            <CardDescription>Informations de l'acheteur</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={saleDetails.customer?.avatar} />
                <AvatarFallback>
                  {getInitials(saleDetails.customerName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{saleDetails.customerName}</p>
                {saleDetails.customer && (
                  <Badge variant="secondary" className="mt-1">
                    {saleDetails.customer.role === 'customer' ? 'Client' : 
                     saleDetails.customer.role === 'organizer' ? 'Organisateur' : 
                     'Admin'}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{saleDetails.customerEmail}</p>
              </div>
            </div>

            {saleDetails.customer?.createdAt && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Membre depuis</p>
                  <p className="text-sm mt-1">
                    {format(new Date(saleDetails.customer.createdAt), "MMMM yyyy", { locale: fr })}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Détails de la commande */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Détails de la commande
            </CardTitle>
            <CardDescription>Informations sur les billets achetés</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type de billet</p>
              <p className="text-lg font-semibold mt-1">
                {saleDetails.ticketName || 'Billet standard'}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quantité</p>
                <p className="text-2xl font-bold mt-1">{saleDetails.quantity}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prix unitaire</p>
                <p className="text-2xl font-bold mt-1">
                  {(saleDetails.totalPrice / saleDetails.quantity).toLocaleString('fr-FR')} F
                </p>
              </div>
            </div>

            <Separator />

            <div className="bg-primary/5 p-4 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Montant total</p>
              <p className="text-3xl font-bold text-primary mt-1">
                {saleDetails.totalPrice.toLocaleString('fr-FR')} F CFA
              </p>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Date d'achat</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">
                  {format(new Date(saleDetails.purchaseDate), "dd MMMM yyyy 'à' HH:mm:ss", { locale: fr })}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">ID de commande</p>
              <code className="text-xs bg-muted px-2 py-1 rounded mt-1 block">
                {saleDetails.id}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Informations de l'organisateur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organisateur
            </CardTitle>
            <CardDescription>Informations sur l'organisateur de l'événement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {saleDetails.organizer ? (
              <>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={saleDetails.organizer.avatar} />
                    <AvatarFallback>
                      {getInitials(saleDetails.organizer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{saleDetails.organizer.name}</p>
                    <Badge variant="outline" className="mt-1">
                      Organisateur
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Email</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{saleDetails.organizer.email}</p>
                  </div>
                </div>

                {saleDetails.organizer.bio && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bio</p>
                      <p className="text-sm mt-1 text-muted-foreground">
                        {saleDetails.organizer.bio}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID organisateur</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded mt-1 block">
                    {saleDetails.organizerId}
                  </code>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Organisateur non disponible</p>
                <p className="text-sm text-muted-foreground mt-1">ID: {saleDetails.organizerId}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Gérer cette commande</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Générer un reçu
          </Button>
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Envoyer un email
          </Button>
          <Button variant="destructive" disabled>
            <CreditCard className="mr-2 h-4 w-4" />
            Rembourser (à implémenter)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}