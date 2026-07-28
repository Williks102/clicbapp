import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { CompetitionTabs } from '@/components/dashboard/competition-tabs';
import { CandidatesManager } from '@/components/dashboard/candidates-manager';
import {
  getCandidatesForCompetition,
  getOwnedCompetition,
} from '@/app/actions/competition-actions';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function CompetitionCandidatesPage({ params }: PageProps) {
  const { id } = await params;
  const competition = await getOwnedCompetition(id);

  if (!competition) notFound();

  const candidates = await getCandidatesForCompetition(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidats"
        description={`Gérez les participants de « ${competition.title} ».`}
      />

      <CompetitionTabs
        competitionId={competition.id}
        liveEnabled={competition.live?.enabled}
      />

      <CandidatesManager competitionId={competition.id} candidates={candidates} />
    </div>
  );
}
