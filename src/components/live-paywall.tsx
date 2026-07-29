'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Lock, PlayCircle, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CustomerFields } from '@/components/payment-fields';
import { initializeLiveAccessOrder } from '@/app/actions/order-actions';
import { formatFCFA } from '@/lib/utils';
import type { Competition } from '@/lib/types';

const formSchema = z.object({
  fullName: z.string().min(2, 'Le nom complet est requis.'),
  email: z.string().email("L'adresse e-mail est invalide."),
});

type LivePaywallProps = {
  competition: Competition;
  requiresLogin: boolean;
};

export function LivePaywall({ competition, requiresLogin }: LivePaywallProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: session?.user?.name || '',
      email: session?.user?.email || '',
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
      });

      if (!init.success || !init.authorizationUrl) {
        throw new Error(init.error || "Impossible d'initialiser le paiement.");
      }

      window.location.href = init.authorizationUrl;
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

              <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                Paiement sécurisé par Paystack — Orange Money, MTN, Moov ou carte.
              </p>
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirection vers le paiement…
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
