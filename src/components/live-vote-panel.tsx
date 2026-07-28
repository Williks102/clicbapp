'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { Gift, Loader2, Zap } from 'lucide-react';

import { useCollection, useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DataError } from '@/components/data-error';
import { useToast } from '@/hooks/use-toast';
import { castFreeVote, getFreeVoteStatus } from '@/app/actions/vote-actions';
import { formatVotes } from '@/lib/utils';
import type { Candidate, Competition } from '@/lib/types';

const FALLBACK_PHOTO = 'https://placehold.co/100x100/1f2937/ffffff?text=%20';

type LiveVotePanelProps = {
  competition: Competition;
  votingOpen: boolean;
};

/** Panneau de vote compact affiché à côté du player pendant la diffusion. */
export function LiveVotePanel({ competition, votingOpen }: LiveVotePanelProps) {
  const { areServicesAvailable, firestore } = useFirebase();
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [votingFor, setVotingFor] = useState<string | null>(null);
  const [freeVoteAvailable, setFreeVoteAvailable] = useState(false);

  const candidatesQuery = useMemo(
    () =>
      areServicesAvailable && firestore
        ? query(
            collection(firestore, 'candidates'),
            where('competitionId', '==', competition.id),
            orderBy('voteCount', 'desc')
          )
        : null,
    [areServicesAvailable, firestore, competition.id]
  );

  const {
    data: candidates,
    isLoading,
    error,
  } = useCollection<Candidate>(candidatesQuery);

  useEffect(() => {
    let cancelled = false;
    getFreeVoteStatus(competition.id).then((status) => {
      if (!cancelled) setFreeVoteAvailable(status.available);
    });
    return () => {
      cancelled = true;
    };
  }, [competition.id, session?.user?.id]);

  const handleFreeVote = (candidate: Candidate) => {
    setVotingFor(candidate.id);
    startTransition(async () => {
      const result = await castFreeVote(competition.id, candidate.id);

      if (result.success) {
        toast({
          title: 'Vote enregistré 🎉',
          description: `Votre vote gratuit est allé à ${candidate.name}.`,
        });
        setFreeVoteAvailable(false);
        router.refresh();
      } else {
        toast({
          title: 'Vote impossible',
          description: result.error,
          variant: 'destructive',
        });
      }
      setVotingFor(null);
    });
  };

  const activeCandidates = (candidates ?? []).filter((c) => !c.eliminated);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Votez pendant le direct
        </CardTitle>
        <CardDescription>
          {votingOpen
            ? 'Soutenez votre favori sans quitter la diffusion.'
            : 'Les votes sont fermés pour ce concours.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        <DataError error={error} subject="les candidats" />

        {!isLoading && !error && activeCandidates.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun candidat en lice.
          </p>
        )}

        <ScrollArea className="max-h-[360px] pr-3">
          <div className="space-y-2">
            {activeCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center gap-3 rounded-lg border p-2"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                  <Image
                    src={candidate.photo || FALLBACK_PHOTO}
                    alt={candidate.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{candidate.name}</p>
                  {!competition.hideResults && (
                    <p className="text-xs text-muted-foreground">
                      {formatVotes(candidate.voteCount || 0)} votes
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-1">
                  {votingOpen && session && freeVoteAvailable && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      title="Utiliser mon vote gratuit"
                      disabled={isPending}
                      onClick={() => handleFreeVote(candidate)}
                    >
                      {isPending && votingFor === candidate.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Gift className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button size="sm" variant={votingOpen ? 'default' : 'outline'} asChild>
                    <Link
                      href={`/competitions/${competition.id}/candidates/${candidate.id}`}
                    >
                      {votingOpen ? 'Voter' : 'Profil'}
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {!session && votingOpen && (
          <Button variant="outline" className="mt-3 w-full" asChild>
            <Link href={`/login?callbackUrl=/competitions/${competition.id}/live`}>
              Se connecter pour voter gratuitement
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
