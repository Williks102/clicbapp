'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertTriangle, CreditCard, Loader2, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CustomerFields, PaymentChannelPicker } from '@/components/payment-fields';
import {
  PAIEMENTPRO_SCRIPT_URL,
  redirectToPayment,
  usePaiementProStatus,
  type PaymentChannel,
} from '@/hooks/use-paiementpro';
import { initializeVotePackOrder } from '@/app/actions/order-actions';
import { formatFCFA } from '@/lib/utils';
import type { Candidate, Competition, VotePack } from '@/lib/types';

const formSchema = z.object({
  fullName: z.string().min(2, 'Le nom complet est requis.'),
  email: z.string().email("L'adresse e-mail est invalide."),
  phone: z.string().min(8, 'Le numéro de téléphone est requis.'),
});

type VoteCheckoutFormProps = {
  competition: Competition;
  candidate: Candidate;
  pack: VotePack;
};

const FALLBACK_PHOTO = 'https://placehold.co/200x200/1f2937/ffffff?text=%20';

export function VoteCheckoutForm({
  competition,
  candidate,
  pack,
}: VoteCheckoutFormProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [channel, setChannel] = useState<PaymentChannel>('mobile-money');
  const { scriptReady, setScriptReady, scriptError, setScriptError } =
    usePaiementProStatus(isProcessing);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: session?.user?.name || '',
      email: session?.user?.email || '',
      phone: '',
    },
  });

  useEffect(() => {
    if (session?.user?.name) form.setValue('fullName', session.user.name);
    if (session?.user?.email) form.setValue('email', session.user.email);
  }, [session, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsProcessing(true);

    try {
      const init = await initializeVotePackOrder({
        competitionId: competition.id,
        candidateId: candidate.id,
        packId: pack.id,
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
      });

      if (!init.success || !init.reference || !init.amount || !init.merchantId) {
        throw new Error(init.error || "Impossible d'initialiser le paiement.");
      }

      await redirectToPayment({
        merchantId: init.merchantId,
        reference: init.reference,
        amount: init.amount,
        description: init.description || `${pack.votes} votes pour ${candidate.name}`,
        channel,
        customerFullName: values.fullName,
        customerEmail: values.email,
        customerPhone: values.phone,
        returnPath: `/vote/success?reference=${init.reference}`,
      });
    } catch (error) {
      console.error('[VOTE CHECKOUT] ❌', error);
      toast({
        title: 'Erreur de paiement',
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  }

  return (
    <>
      <Script
        src={PAIEMENTPRO_SCRIPT_URL}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() =>
          setScriptError(
            "Le script de paiement n'a pas pu être chargé. Vérifiez votre connexion internet."
          )
        }
      />

      {scriptError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Passerelle de paiement indisponible</AlertTitle>
          <AlertDescription>{scriptError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 pt-6">
              {/* Récapitulatif */}
              <div className="flex items-center gap-4 rounded-lg border bg-muted/40 p-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={candidate.photo || FALLBACK_PHOTO}
                    alt={candidate.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{candidate.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {competition.title}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Zap className="h-4 w-4" />
                    {pack.votes.toLocaleString('fr-FR')} votes — {pack.name}
                  </p>
                </div>
              </div>

              <CustomerFields form={form} />

              <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
                <div className="flex justify-between text-sm">
                  <span>Pack</span>
                  <span>{pack.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Votes crédités</span>
                  <span>{pack.votes.toLocaleString('fr-FR')}</span>
                </div>
                <div className="mt-2 flex justify-between border-t pt-2 text-lg font-semibold">
                  <span>Total à payer</span>
                  <span className="text-primary">{formatFCFA(pack.price)}</span>
                </div>
              </div>

              <PaymentChannelPicker value={channel} onChange={setChannel} />
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isProcessing || !scriptReady}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Traitement en cours…
                  </>
                ) : !scriptReady ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chargement du paiement…
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Payer {formatFCFA(pack.price)}
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
