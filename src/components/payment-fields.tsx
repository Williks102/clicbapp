'use client';

import { Mail, Phone, User } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { PaymentChannel } from '@/hooks/use-paiementpro';

/** Champs d'identité communs aux tunnels de paiement. */
export function CustomerFields({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom complet</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Jean Kouassi" className="pl-10" {...field} />
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
              <FormLabel>Adresse e-mail</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="jean@example.com"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Numéro de téléphone</FormLabel>
            <FormControl>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="0701020304"
                  className="pl-10"
                  {...field}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/** Sélecteur du moyen de paiement. */
export function PaymentChannelPicker({
  value,
  onChange,
}: {
  value: PaymentChannel;
  onChange: (channel: PaymentChannel) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>Moyen de paiement</Label>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as PaymentChannel)}
        className="grid grid-cols-1 gap-2"
      >
        <Label className="flex cursor-pointer items-center gap-4 rounded-lg border p-4 hover:bg-accent hover:text-accent-foreground has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground">
          <RadioGroupItem value="mobile-money" id="mobile-money" />
          <div className="flex flex-col">
            <span>Mobile Money</span>
            <span className="text-xs opacity-70">Orange, MTN, Moov, Wave</span>
          </div>
        </Label>
        <Label className="flex cursor-pointer items-center gap-4 rounded-lg border p-4 hover:bg-accent hover:text-accent-foreground has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground">
          <RadioGroupItem value="card" id="card" />
          <div className="flex flex-col">
            <span>Carte bancaire</span>
            <span className="text-xs opacity-70">Visa, Mastercard</span>
          </div>
        </Label>
      </RadioGroup>
      <p className="pt-1 text-center text-xs text-muted-foreground">
        Paiement sécurisé par Paiement Pro
      </p>
    </div>
  );
}
