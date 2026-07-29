import Image from 'next/image';
import Link from 'next/link';
import { Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn, formatVotes } from '@/lib/utils';
import type { Candidate } from '@/lib/types';

const FALLBACK_PHOTO =
  'https://placehold.co/600x600/1f2937/ffffff?text=Candidat';

type CandidateCardProps = {
  candidate: Candidate;
  /** Position au classement (1 = premier). Masqué si non fourni. */
  rank?: number;
  /** Part des votes du concours, en pourcentage. */
  percentage?: number;
  showVotes?: boolean;
  votingOpen?: boolean;
  className?: string;
};

const RANK_STYLES: Record<number, string> = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-slate-300 text-slate-800',
  3: 'bg-orange-400 text-orange-950',
};

export default function CandidateCard({
  candidate,
  rank,
  percentage,
  showVotes = true,
  votingOpen = true,
  className,
}: CandidateCardProps) {
  const href = `/competitions/${candidate.competitionId}/candidates/${candidate.id}`;

  return (
    <Card
      className={cn(
        'group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg',
        candidate.eliminated && 'opacity-60',
        className
      )}
    >
      <Link href={href} className="block">
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          <Image
            src={candidate.photo || FALLBACK_PHOTO}
            alt={candidate.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {rank !== undefined && rank <= 3 && !candidate.eliminated && (
            <span
              className={cn(
                'absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow',
                RANK_STYLES[rank]
              )}
            >
              {rank}
            </span>
          )}

          <Badge className="absolute right-3 top-3" variant="secondary">
            N°{candidate.number}
          </Badge>

          {candidate.eliminated && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Badge variant="destructive">Éliminé</Badge>
            </div>
          )}
        </div>
      </Link>

      <CardContent className="space-y-1 p-4">
        <Link href={href}>
          <h3 className="font-headline truncate text-base font-bold transition-colors group-hover:text-primary">
            {candidate.name}
          </h3>
        </Link>
        {candidate.city && (
          <p className="truncate text-sm text-muted-foreground">{candidate.city}</p>
        )}

        {showVotes && (
          <div className="flex items-center gap-1.5 pt-1 text-sm font-semibold text-primary">
            <Medal className="h-4 w-4" />
            {formatVotes(candidate.voteCount)} votes
            {percentage !== undefined && (
              <span className="font-normal text-muted-foreground">
                ({percentage.toFixed(1).replace('.', ',')} %)
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          asChild
          className="w-full"
          disabled={candidate.eliminated}
          variant={votingOpen && !candidate.eliminated ? 'default' : 'outline'}
        >
          <Link href={href}>
            {candidate.eliminated
              ? 'Voir le profil'
              : votingOpen
                ? 'Voter'
                : 'Voir le profil'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
