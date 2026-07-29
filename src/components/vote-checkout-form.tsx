'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CreditCard, Loader2, ShieldCheck, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CustomerFields } from '@/components/payment-fields';
import { initializeVotePackOrder } from '@/app/actions/order-actions';
import { formatFCFA } from '@/lib/utils';
import type { Candidate, Competition, VotePack } from '@/lib/types';

const formSchema = z.object({
  fullName: z.string().min(2, 'Le nom complet est requis.'),
  email: z.string().email("L'adresse e-mail est invalide."),
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsProcessing(true);

    try {
      const init = await initializeVotePackOrder({
        competitionId: competition.id,
        candidateId: candidate.id,
        packId: pack.id,
        fullName: values.fullName,
        email: values.email,
      });

      if (!init.success || !init.authorizationUrl) {
        throw new Error(init.error || "Impossible d'initialiser le paiement.");
      }

      // Paystack héberge la page de paiement : le choix de l'opérateur
      // (Orange, MTN, Moov) et la saisie du numéro s'y font.
      window.location.href = init.authorizationUrl;
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

              <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                Paiement sécurisé par Paystack — Orange Money, MTN, Moov ou carte
                bancaire.
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
