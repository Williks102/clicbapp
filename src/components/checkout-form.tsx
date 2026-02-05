
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Mail, User, CreditCard } from 'lucide-react';

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
  CardFooter,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/lib/types';
import { createPurchaseAndSendTicket } from '@/app/actions/ticket-actions';
import { PurchaseModal } from '@/components/purchase-modal';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Schéma de validation conditionnel
const formSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().optional(),
  quantity: z.number().min(1).max(10),
});

type CheckoutFormProps = {
  event: Event;
  ticketId: string;
};

export function CheckoutForm({ event, ticketId }: CheckoutFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [guestInfo, setGuestInfo] = useState<{ email: string; name: string } | null>(null);

  const ticket = event.tickets.find((t) => t.id === ticketId);

  // ✅ FIX: Don't use session in defaultValues to prevent React hook errors
  // when session changes after login during checkout
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      quantity: 1,
    },
  });

  // ✅ FIX: Update form values when session changes
  useEffect(() => {
    if (session?.user) {
      if (session.user.name && !form.getValues('fullName')) {
        form.setValue('fullName', session.user.name);
      }
      if (session.user.email && !form.getValues('email')) {
        form.setValue('email', session.user.email);
      }
    }
  }, [session, form]);

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

  const quantity = form.watch('quantity');
  const totalPrice = ticket.price * quantity;

  // Gestion de l'achat en mode invité
  const handleGuestPurchase = async (email: string, name: string) => {
    setGuestInfo({ email, name });
    setShowPurchaseModal(false);
    
    // Procéder directement au paiement avec les infos invité
    await processPurchase({
      fullName: name,
      email: email,
      quantity: form.getValues('quantity')
    });
  };

  // Gestion de l'achat en mode connecté
  const handleUserPurchase = async () => {
    setShowPurchaseModal(false);
    
    // Utiliser les infos de la session
    await processPurchase({
      fullName: session?.user?.name || '',
      email: session?.user?.email || '',
      quantity: form.getValues('quantity')
    });
  };

  // Traitement de l'achat
  const processPurchase = async (purchaseData: {
    fullName: string;
    email: string;
    quantity: number;
  }) => {
    if (!ticket) return;
    
    setIsProcessing(true);

    try {
      toast({
        title: 'Traitement en cours...',
        description: 'Création de votre commande',
      });

      const result = await createPurchaseAndSendTicket({
        eventId: event.id,
        ticketId: ticket.id,
        quantity: purchaseData.quantity,
        fullName: purchaseData.fullName,
        email: purchaseData.email,
        totalPrice: ticket.price * purchaseData.quantity,
      });

      if (result.success) {
        toast({
          title: '✅ Achat confirmé !',
          description: 'Votre billet a été envoyé par email.',
        });
        
        // Rediriger vers une page de confirmation
        router.push(`/purchase/success?orderId=${result.saleId}`);
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Une erreur est survenue',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du traitement',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Soumission du formulaire
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Ouvrir le modal de choix si pas connecté
    if (!session?.user && !guestInfo) {
      setShowPurchaseModal(true);
      return;
    }

    // Si connecté ou déjà invité, procéder directement
    await processPurchase({
      fullName: guestInfo?.name || session?.user?.name || values.fullName || '',
      email: guestInfo?.email || session?.user?.email || values.email || '',
      quantity: values.quantity
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Finaliser votre commande</CardTitle>
          <CardDescription>
            {event.name} - {ticket.name}
          </CardDescription>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* Sélection de la quantité */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de billets</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Récapitulatif */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Prix unitaire</span>
                  <span>{ticket.price.toLocaleString('fr-FR')} F CFA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Quantité</span>
                  <span>× {quantity}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{totalPrice.toLocaleString('fr-FR')} F CFA</span>
                </div>
              </div>
              
               {/* Méthode de paiement */}
              <div className="space-y-3">
                  <Label>Méthode de paiement</Label>
                  <RadioGroup defaultValue="mobile-money" className="grid grid-cols-1 gap-2">
                      <Label className="flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                          <RadioGroupItem value="mobile-money" id="mobile-money" />
                          <div className="flex flex-col">
                          <span>Mobile Money</span>
                          <span className="text-xs opacity-70">Orange, MTN, Wave</span>
                          </div>
                      </Label>
                      <Label className="flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                          <RadioGroupItem value="card" id="card" />
                          <div className="flex flex-col">
                              <span>Carte Bancaire</span>
                              <span className="text-xs opacity-70">Visa, Mastercard</span>
                          </div>
                      </Label>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground text-center pt-2">Paiement sécurisé via CinetPay</p>
              </div>

              {/* Afficher les infos utilisateur si connecté */}
              {session?.user && (
                <div className="rounded-lg bg-muted p-4 space-y-1">
                  <p className="text-sm font-medium">Achat pour :</p>
                  <p className="text-sm text-muted-foreground">
                    {session.user.name} ({session.user.email})
                  </p>
                </div>
              )}

              {/* Afficher les infos invité si renseignées */}
              {guestInfo && !session?.user && (
                <div className="rounded-lg bg-muted p-4 space-y-1">
                  <p className="text-sm font-medium">Achat pour :</p>
                  <p className="text-sm text-muted-foreground">
                    {guestInfo.name} ({guestInfo.email})
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setGuestInfo(null);
                      setShowPurchaseModal(true);
                    }}
                    className="p-0 h-auto"
                  >
                    Modifier
                  </Button>
                </div>
              )}
            </CardContent>

            <CardFooter>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isProcessing || !ticket}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {session?.user || guestInfo 
                      ? `Payer ${totalPrice.toLocaleString('fr-FR')} F CFA` 
                      : 'Continuer vers le paiement'}
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {/* Modal de choix : connexion ou invité */}
      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        event={event}
        ticketId={ticketId}
        quantity={form.getValues('quantity')}
        onProceedAsGuest={handleGuestPurchase}
        onProceedAsUser={handleUserPurchase}
      />
    </>
  );
}
