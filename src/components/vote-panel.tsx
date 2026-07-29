'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Gift, Loader2, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { castFreeVote, getFreeVoteStatus } from '@/app/actions/vote-actions';
import { cn, formatFCFA } from '@/lib/utils';
import type { Candidate, Competition } from '@/lib/types';

type VotePanelProps = {
  competition: Competition;
  candidate: Candidate;
  votingOpen: boolean;
};

export function VotePanel({ competition, candidate, votingOpen }: VotePanelProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [freeVote, setFreeVote] = useState<{
    available: boolean;
    requiresLogin: boolean;
    nextFreeVoteAt?: string;
  }>({ available: false, requiresLogin: !session });

  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getFreeVoteStatus(competition.id)
      .then((status) => {
        if (!cancelled) setFreeVote(status);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, [competition.id, session?.user?.id]);

  const handleFreeVote = () => {
    startTransition(async () => {
      const result = await castFreeVote(competition.id, candidate.id);

      if (result.success) {
        toast({
          title: 'Vote enregistré 🎉',
          description: result.message,
        });
        setFreeVote({
          available: false,
          requiresLogin: false,
          nextFreeVoteAt: result.nextFreeVoteAt,
        });
        router.refresh();
      } else {
        toast({
          title: 'Vote impossible',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  };

  const packs = competition.votePacks ?? [];
  const disabled = !votingOpen || candidate.eliminated;

  return (
    <div className="space-y-4">
      {/* ---------- Vote gratuit ---------- */}
      {competition.freeVote?.enabled && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-5 w-5 text-primary" />
              Vote gratuit
            </CardTitle>
            <CardDescription>
              1 vote offert toutes les {competition.freeVote.cooldownHours} heures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? (
              <Button className="w-full" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vérification…
              </Button>
            ) : freeVote.requiresLogin ? (
              <Button className="w-full" asChild>
                <Link
                  href={`/login?callbackUrl=/competitions/${competition.id}/candidates/${candidate.id}`}
                >
                  Se connecter pour voter gratuitement
                </Link>
              </Button>
            ) : freeVote.available && !disabled ? (
              <Button className="w-full" onClick={handleFreeVote} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="mr-2 h-4 w-4" />
                )}
                Voter gratuitement pour {candidate.name.split(' ')[0]}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button className="w-full" disabled>
                  Vote gratuit déjà utilisé
                </Button>
                {freeVote.nextFreeVoteAt && (
                  <p className="text-center text-xs text-muted-foreground">
                    Prochain vote gratuit le{' '}
                    {new Date(freeVote.nextFreeVoteAt).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------- Packs de votes ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-primary" />
            Booster {candidate.name.split(' ')[0]}
          </CardTitle>
          <CardDescription>
            Achetez un pack et faites grimper votre favori au classement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {packs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun pack de votes disponible pour ce concours.
            </p>
          )}

          {packs.map((pack) => (
            <Link
              key={pack.id}
              href={
                disabled
                  ? '#'
                  : `/competitions/${competition.id}/vote/${candidate.id}?pack=${pack.id}`
              }
              aria-disabled={disabled}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3 transition-all',
                disabled
                  ? 'pointer-events-none opacity-50'
                  : 'hover:border-primary hover:bg-primary/5',
                pack.highlighted && 'border-primary bg-primary/5'
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{pack.name}</span>
                  {pack.highlighted && (
                    <Badge className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      Populaire
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {pack.votes.toLocaleString('fr-FR')} votes
                </p>
              </div>
              <span className="font-headline shrink-0 font-bold text-primary">
                {formatFCFA(pack.price)}
              </span>
            </Link>
          ))}

          {!votingOpen && (
            <p className="pt-2 text-center text-sm text-muted-foreground">
              Les votes sont fermés pour ce concours.
            </p>
          )}
          {candidate.eliminated && (
            <p className="pt-2 text-center text-sm text-destructive">
              Ce candidat est éliminé du concours.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
