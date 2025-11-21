'use client';

import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreditCard,
  User,
  Mail,
  Smartphone,
  MinusCircle,
  PlusCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Event, TicketTier } from '@/lib/types';
import { useEffect } from 'react';

const formSchema = z.object({
  fullName: z.string().min(2, 'Le nom complet est requis.'),
  email: z.string().email("L'adresse email est invalide."),
  quantity: z.coerce
    .number()
    .int()
    .min(1, 'Vous devez sélectionner au moins 1 billet.'),
  paymentMethod: z
    .string()
    .min(1, 'Veuillez sélectionner un mode de paiement.'),
  mobileMoneyNumber: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof formSchema>;

type CheckoutFormProps = {
  event: Event;
  ticket: TicketTier;
};

export default function CheckoutForm({ event, ticket }: CheckoutFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      quantity: 1,
      paymentMethod: '',
      mobileMoneyNumber: '',
    },
  });

  const quantity = useWatch({
    control: form.control,
    name: 'quantity',
  });
  
  useEffect(() => {
    if (quantity > ticket.quantity) {
        form.setValue('quantity', ticket.quantity);
        toast({
            title: 'Quantité maximale atteinte',
            description: `Il ne reste que ${ticket.quantity} billets de ce type.`,
            variant: 'destructive',
        });
    }
  }, [quantity, ticket.quantity, form, toast]);


  const totalPrice = ticket.price * (quantity || 1);

  function onSubmit(data: CheckoutFormValues) {
    console.log(data);
    toast({
      title: 'Paiement en cours...',
      description:
        'Veuillez patienter pendant que nous traitons votre paiement.',
    });

    const orderId = `sale-${Math.random().toString(36).substring(2, 7)}`;

    // Simulate payment processing
    setTimeout(() => {
      const params = new URLSearchParams();
      params.set('eventId', event.id);
      params.set('ticketId', ticket.id);
      params.set('quantity', data.quantity.toString());
      params.set('fullName', data.fullName);
      params.set('email', data.email);
      params.set('orderId', orderId);
      
      const confirmationUrl = `/events/${event.id}/confirmation?${params.toString()}`;
      router.push(confirmationUrl);
    }, 2000);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    placeholder="email@example.com"
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
              <FormLabel>Quantité</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => form.setValue('quantity', Math.max(1, field.value - 1))}
                        disabled={field.value <= 1}
                    >
                        <MinusCircle className="h-4 w-4" />
                    </Button>
                    <Input
                        {...field}
                        type="number"
                        className="w-16 text-center"
                        min="1"
                        max={ticket.quantity}
                        onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            if (isNaN(val) || val < 1) {
                                field.onChange(1);
                            } else if (val > ticket.quantity) {
                                field.onChange(ticket.quantity);
                            } else {
                                field.onChange(val);
                            }
                        }}
                    />
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => form.setValue('quantity', Math.min(ticket.quantity, field.value + 1))}
                        disabled={field.value >= ticket.quantity}
                    >
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Moyen de Paiement</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un moyen de paiement" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="om">Orange Money</SelectItem>
                  <SelectItem value="momo">MTN Mobile Money</SelectItem>
                  <SelectItem value="wave">Wave</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="mobileMoneyNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de téléphone</FormLabel>
              <FormControl>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="0700000000"
                    {...field}
                    className="pl-10"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Card className="bg-secondary/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                {ticket.name} (x{quantity || 1})
              </p>
              <p className="font-bold">
                {(ticket.price * (quantity || 1)).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between text-lg">
              <p className="font-bold">Total</p>
              <p className="font-extrabold text-primary">
                {totalPrice.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </CardContent>
        </Card>
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting
            ? 'Traitement...'
            : 'Payer maintenant'}
          <CreditCard className="ml-2 h-5 w-5" />
        </Button>
      </form>
    </Form>
  );
}
