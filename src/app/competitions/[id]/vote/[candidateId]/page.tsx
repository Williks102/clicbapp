import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { VoteCheckoutForm } from '@/components/vote-checkout-form';
import { getCompetition } from '@/app/actions/competition-actions';
import { getCandidate } from '@/app/actions/candidate-actions';
import { isVotingOpen } from '@/lib/live-utils';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string; candidateId: string }>;
  searchParams: Promise<{ pack?: string }>;
};

export default async function VoteCheckoutPage({ params, searchParams }: PageProps) {
  const [{ id, candidateId }, { pack: packId }] = await Promise.all([
    params,
    searchParams,
  ]);

  const [competition, candidate] = await Promise.all([
    getCompetition(id),
    getCandidate(candidateId),
  ]);

  if (
    !competition ||
    competition.status === 'draft' ||
    !candidate ||
    candidate.competitionId !== competition.id
  ) {
    notFound();
  }

  const candidateUrl = `/competitions/${competition.id}/candidates/${candidate.id}`;
  const pack = competition.votePacks?.find((p) => p.id === packId);

  if (!pack) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <PageHeader
          title="Pack introuvable"
          description="Le pack de votes sélectionné n'existe plus pour ce concours."
        />
        <Button className="mt-6" asChild>
          <Link href={candidateUrl}>Choisir un autre pack</Link>
        </Button>
      </div>
    );
  }

  if (!isVotingOpen(competition) || candidate.eliminated) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <PageHeader
          title="Vote indisponible"
          description={
            candidate.eliminated
              ? 'Ce candidat est éliminé du concours.'
              : 'Les votes ne sont pas ouverts pour ce concours.'
          }
        />
        <Button className="mt-6" asChild>
          <Link href={`/competitions/${competition.id}`}>Retour au concours</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href={candidateUrl}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au candidat
        </Link>
      </Button>

      <PageHeader
        title="Finaliser votre vote"
        description={`Vos votes sont crédités à ${candidate.name} dès confirmation du paiement.`}
        className="mb-6"
      />

      <VoteCheckoutForm
        competition={competition}
        candidate={candidate}
        pack={pack}
      />
    </div>
  );
}
