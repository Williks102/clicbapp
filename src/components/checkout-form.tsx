'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Mail, User, CreditCard, Phone } from 'lucide-react';
import Script from 'next/script';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { generateId } from '@/lib/utils';


// Schéma de validation incluant le numéro de téléphone
const formSchema = z.object({
  fullName: z.string().min(2, "Le nom complet est requis."),
  email: z.string().email("L'adresse email est invalide."),
  phoneNumber: z.string().min(10, "Le numéro de téléphone est requis."),
  quantity: z.number().min(1, "La quantité doit être d'au moins 1.").max(10, "Vous ne pouvez pas acheter plus de 10 billets à la fois."),
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
  const [paymentChannel, setPaymentChannel] = useState('mobile-money');
  const [scriptReady, setScriptReady] = useState(false); // New state

  const ticket = event.tickets.find((t) => t.id === ticketId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: session?.user?.name || '',
      email: session?.user?.email || '',
      phoneNumber: '',
      quantity: 1,
    },
  });

  // Mettre à jour le formulaire si l'utilisateur se connecte
  useEffect(() => {
    if (session?.user) {
      if (session.user.name) form.setValue('fullName', session.user.name);
      if (session.user.email) form.setValue('email', session.user.email);
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

  // Soumission du formulaire pour initier le paiement
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!ticket) return;
    setIsProcessing(true);

    const merchantId = process.env.NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID;

    if (!merchantId) {
      toast({
        title: 'Configuration requise',
        description: "L'ID marchand de la passerelle de paiement n'est pas configuré.",
        variant: 'destructive',
      });
      setIsProcessing(false);
      return;
    }
    
    if (!scriptReady || typeof (window as any).PaiementPro === 'undefined') {
      toast({
        title: 'Erreur de paiement',
        description: 'La passerelle de paiement n\'a pas pu être chargée. Veuillez rafraîchir la page.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      return;
    }

    const referenceNumber = generateId(`clicbillet-${event.id.slice(0, 4)}`);
    const [firstName, ...lastNameParts] = values.fullName.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;
    const description = `Achat de ${values.quantity} billet(s) pour "${event.name}"`;

    const returnContext = JSON.stringify({
      eventId: event.id,
      ticketId: ticket.id,
      quantity: values.quantity,
      fullName: values.fullName,
      email: values.email,
      totalPrice: totalPrice,
      organizerId: event.organizerId
    });

    try {
      const paiementPro = new (window as any).PaiementPro(merchantId);
      
      paiementPro.amount = totalPrice;
      paiementPro.channel = paymentChannel === 'mobile-money' ? 'MOBILE_MONEY_CI' : 'CARD';
      paiementPro.referenceNumber = referenceNumber;
      paiementPro.customerEmail = values.email;
      paiementPro.customerFirstName = firstName;
      paiementPro.customerLastname = lastName;
      paiementPro.customerPhoneNumber = values.phoneNumber;
      paiementPro.description = description;
      paiementPro.currency = 'XOF';
      paiementPro.notificationURL = `${window.location.origin}/api/payment/webhook`;
      paiementPro.returnURL = `${window.location.origin}/purchase/success?orderId=${referenceNumber}`;
      paiementPro.returnContext = returnContext;

      console.log("Préparation du paiement avec Paiement Pro...");
      
      await paiementPro.getUrlPayment();
      
      if (paiementPro.success) {
          console.log("Redirection vers la passerelle de paiement:", paiementPro.url);
          window.location.href = paiementPro.url;
      } else {
          throw new Error("Impossible d'initialiser le paiement. Raison: " + (paiementPro.message || 'Erreur inconnue de la passerelle.'));
      }
    } catch(error) {
      console.error("Erreur lors de l'initialisation de Paiement Pro:", error);
      toast({
          title: 'Erreur de paiement',
          description: error instanceof Error ? error.message : "La passerelle de paiement n'a pas pu être initialisée. Vérifiez la console pour plus de détails.",
          variant: 'destructive',
      });
      setIsProcessing(false);
    }
  }

  return (
    <>
      <Script 
        src="https://www.paiementpro.net/webservice/onlinepayment/js/paiementpro.v1.0.1.js" 
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => {
            toast({
                title: 'Erreur critique',
                description: 'Le script de paiement externe n\'a pas pu être chargé. Veuillez vérifier votre connexion internet ou désactiver votre bloqueur de publicités.',
                variant: 'destructive',
                duration: 10000,
            });
        }}
      />
      <Card className="border-none shadow-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 p-0">
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                 {/* Nom complet */}
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                          <Input placeholder="Jean Kouassi" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse e-mail</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                           <Input type="email" placeholder="jean@example.com" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Numéro de téléphone */}
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de téléphone</FormLabel>
                        <FormControl>
                          <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                              <Input type="tel" placeholder="0701020304" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Quantité */}
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
                            max={Math.min(10, ticket.quantity)}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

              {/* Récapitulatif */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Prix unitaire</span>
                  <span>{ticket.price.toLocaleString('fr-FR')} F CFA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Quantité</span>
                  <span>× {quantity}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-lg">
                  <span>Total à payer</span>
                  <span className="text-primary">{totalPrice.toLocaleString('fr-FR')} F CFA</span>
                </div>
              </div>
              
               {/* Méthode de paiement */}
              <div className="space-y-3">
                  <Label>Méthode de paiement</Label>
                  <RadioGroup defaultValue={paymentChannel} onValueChange={setPaymentChannel} className="grid grid-cols-1 gap-2">
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
                  <p className="text-xs text-muted-foreground text-center pt-2">Paiement sécurisé</p>
              </div>

            </CardContent>

            <CardFooter className="p-0 pt-6">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isProcessing || !ticket || !scriptReady}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Traitement en cours...
                  </>
                ) : !scriptReady ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement du paiement...
                    </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Payer {totalPrice.toLocaleString('fr-FR')} F CFA
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
