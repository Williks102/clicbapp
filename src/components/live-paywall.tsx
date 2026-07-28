'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertTriangle, Lock, Loader2, PlayCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CustomerFields, PaymentChannelPicker } from '@/components/payment-fields';
import {
  PAIEMENTPRO_SCRIPT_URL,
  redirectToPayment,
  usePaiementProStatus,
  type PaymentChannel,
} from '@/hooks/use-paiementpro';
import { initializeLiveAccessOrder } from '@/app/actions/order-actions';
import { formatFCFA } from '@/lib/utils';
import type { Competition } from '@/lib/types';

const formSchema = z.object({
  fullName: z.string().min(2, 'Le nom complet est requis.'),
  email: z.string().email("L'adresse e-mail est invalide."),
  phone: z.string().min(8, 'Le numéro de téléphone est requis.'),
});

type LivePaywallProps = {
  competition: Competition;
  requiresLogin: boolean;
};

export function LivePaywall({ competition, requiresLogin }: LivePaywallProps) {
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

  if (requiresLogin) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Direct réservé aux membres</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder au direct de {competition.title}.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" asChild>
            <Link href={`/login?callbackUrl=/competitions/${competition.id}/live`}>
              Se connecter
            </Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/signup">Créer un compte</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsProcessing(true);

    try {
      const init = await initializeLiveAccessOrder({
        competitionId: competition.id,
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
        description: init.description || `Accès au direct — ${competition.title}`,
        channel,
        customerFullName: values.fullName,
        customerEmail: values.email,
        customerPhone: values.phone,
        returnPath: `/vote/success?reference=${init.reference}`,
      });
    } catch (error) {
      console.error('[LIVE PAYWALL] ❌', error);
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

      <Card className="mx-auto max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <PlayCircle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{competition.live.title || competition.title}</CardTitle>
          <CardDescription>
            Accédez à la diffusion intégrale et votez pendant l&apos;émission.
          </CardDescription>
        </CardHeader>

        {scriptError && (
          <div className="px-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Passerelle de paiement indisponible</AlertTitle>
              <AlertDescription>{scriptError}</AlertDescription>
            </Alert>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <CustomerFields form={form} />

              <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4 text-lg font-semibold">
                <span>Accès au direct</span>
                <span className="text-primary">
                  {formatFCFA(competition.live.price)}
                </span>
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
                {isProcessing || !scriptReady ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isProcessing ? 'Traitement en cours…' : 'Chargement du paiement…'}
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Débloquer le direct — {formatFCFA(competition.live.price)}
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
