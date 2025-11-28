'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Mail, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/lib/types';
import { createPurchaseAndSendTicket } from '@/app/actions/ticket-actions';

const formSchema = z.object({
  fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  quantity: z.number().min(1).max(10),
});

type CheckoutFormProps = {
  event: Event;
  ticketId: string;
};

export function CheckoutForm({ event, ticketId }: CheckoutFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const ticket = event.tickets.find((t) => t.id === ticketId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      quantity: 1,
    },
  });

  // ✅ Early return si le billet n'existe pas
  if (!ticket) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Billet introuvable
          </p>
        </CardContent>
      </Card>
    );
  }

  // ✅ À partir d'ici, TypeScript sait que ticket est défini
  const quantity = form.watch('quantity');
  const totalPrice = ticket.price * quantity;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // ✅ Guard clause supplémentaire pour être sûr
    if (!ticket) return;
    
    setIsProcessing(true);

    try {
      toast({
        title: 'Traitement en cours...',
        description: 'Création de votre commande',
      });

      // Créer l'achat et envoyer le billet
      const result = await createPurchaseAndSendTicket({
        eventId: event.id,
        ticketId: ticket.id,
        quantity: values.quantity,
        fullName: values.fullName,
        email: values.email,
        totalPrice,
      });

      if (result.success) {
        toast({
          title: '✅ Achat confirmé !',
          description: result.message,
        });

        // Rediriger vers la page de confirmation
        const params = new URLSearchParams({
          saleId: result.saleId!,
          eventId: event.id,
        });
        router.push(`/events/${event.id}/confirmation?${params.toString()}`);
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
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
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations de Contact</CardTitle>
            <CardDescription>
              Votre billet électronique sera envoyé à cette adresse email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom et Prénoms</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="John Doe" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de billets</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type de billet</span>
              <span className="font-medium">{ticket.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prix unitaire</span>
              <span className="font-medium">
                {ticket.price.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantité</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold text-lg">Total</span>
              <span className="font-bold text-lg text-primary">
                {totalPrice.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>📧 Livraison instantanée</strong>
            <br />
            Votre billet électronique avec QR code sera envoyé immédiatement à votre email.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>Confirmer l'achat</>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          En confirmant, vous acceptez de recevoir votre billet par email.
          <br />
          Vérifiez vos spams si vous ne recevez rien.
        </p>
      </form>
    </Form>
  );
}

export default CheckoutForm;