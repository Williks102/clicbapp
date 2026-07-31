'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock, Loader2, PlayCircle, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getOrderStatus } from '@/app/actions/order-actions';
import { formatFCFA } from '@/lib/utils';

type OrderStatus = Awaited<ReturnType<typeof getOrderStatus>>;

/** Le webhook peut arriver quelques secondes après le retour du client. */
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

function VoteSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('orderId');

  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!reference) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async (count: number) => {
      const result = await getOrderStatus(reference);
      if (cancelled) return;

      setOrder(result);
      setAttempts(count);

      const settled =
        !result.found || (result.status && result.status !== 'PENDING');

      if (!settled && count < MAX_POLLS) {
        timer = setTimeout(() => poll(count + 1), POLL_INTERVAL_MS);
      }
    };

    poll(1);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reference]);

  if (!reference) {
    return (
      <StatusCard
        icon={<AlertCircle className="h-8 w-8 text-destructive" />}
        title="Référence manquante"
        description="Aucune référence de commande n'a été transmise."
        action={{ href: '/competitions', label: 'Retour aux concours' }}
      />
    );
  }

  if (!order) {
    return (
      <StatusCard
        icon={<Loader2 className="h-8 w-8 animate-spin text-primary" />}
        title="Vérification du paiement…"
        description="Merci de patienter quelques instants."
      />
    );
  }

  if (!order.found) {
    return (
      <StatusCard
        icon={<AlertCircle className="h-8 w-8 text-destructive" />}
        title="Commande introuvable"
        description={`Aucune commande ne correspond à la référence ${reference}.`}
        action={{ href: '/competitions', label: 'Retour aux concours' }}
      />
    );
  }

  if (order.status === 'PAID') {
    const isVotePack = order.type === 'VOTE_PACK';

    return (
      <StatusCard
        icon={<CheckCircle2 className="h-8 w-8 text-green-600" />}
        title={isVotePack ? 'Votes enregistrés !' : 'Accès au direct confirmé !'}
        description={
          isVotePack
            ? `${order.votes?.toLocaleString('fr-FR')} votes ont été crédités à ${order.candidateName}.`
            : `Votre accès au direct de ${order.competitionTitle} est actif.`
        }
        details={[
          ['Référence', reference],
          ['Montant', formatFCFA(order.amount ?? 0)],
          ['Concours', order.competitionTitle ?? '—'],
          // Remis uniquement pour un accès au direct : c'est la référence que
          // l'acheteur conserve, également envoyée par e-mail.
          ...(order.accessCode
            ? ([["Code d'accès", order.accessCode]] as Array<[string, string]>)
            : []),
        ]}
        action={
          isVotePack && order.competitionId && order.candidateId
            ? {
                href: `/competitions/${order.competitionId}/candidates/${order.candidateId}`,
                label: 'Voir le classement',
                icon: <Zap className="mr-2 h-4 w-4" />,
              }
            : {
                href: `/competitions/${order.competitionId}/live`,
                label: 'Accéder au direct',
                icon: <PlayCircle className="mr-2 h-4 w-4" />,
              }
        }
        secondaryAction={{ href: '/account', label: 'Mon activité' }}
      />
    );
  }

  if (order.status === 'PENDING') {
    const exhausted = attempts >= MAX_POLLS;

    return (
      <StatusCard
        icon={
          exhausted ? (
            <Clock className="h-8 w-8 text-amber-500" />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          )
        }
        title={exhausted ? 'Paiement en cours de traitement' : 'Confirmation en cours…'}
        description={
          exhausted
            ? "La confirmation de votre opérateur tarde. Vos votes seront crédités dès réception : vous recevrez un e-mail de confirmation."
            : 'Nous attendons la confirmation de votre opérateur de paiement.'
        }
        details={[['Référence', reference]]}
        action={{ href: '/account', label: 'Voir mon activité' }}
      />
    );
  }

  return (
    <StatusCard
      icon={<AlertCircle className="h-8 w-8 text-destructive" />}
      title="Paiement non abouti"
      description="Votre paiement n'a pas pu être validé. Aucun montant n'a été débité, vous pouvez réessayer."
      details={[
        ['Référence', reference],
        ['Statut', order.status ?? '—'],
      ]}
      action={
        order.competitionId
          ? { href: `/competitions/${order.competitionId}`, label: 'Réessayer' }
          : { href: '/competitions', label: 'Retour aux concours' }
      }
    />
  );
}

type StatusCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  details?: Array<[string, string]>;
  action?: { href: string; label: string; icon?: React.ReactNode };
  secondaryAction?: { href: string; label: string };
};

function StatusCard({
  icon,
  title,
  description,
  details,
  action,
  secondaryAction,
}: StatusCardProps) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <CardTitle className="font-headline text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      {details && details.length > 0 && (
        <CardContent>
          <dl className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="truncate font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      )}

      <CardFooter className="flex flex-col gap-2">
        {action && (
          <Button className="w-full" asChild>
            <Link href={action.href}>
              {action.icon}
              {action.label}
            </Link>
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" className="w-full" asChild>
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default function VoteSuccessPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <VoteSuccessContent />
      </Suspense>
    </div>
  );
}
