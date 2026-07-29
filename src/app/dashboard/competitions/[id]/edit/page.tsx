import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { CompetitionForm } from '@/components/competition-form';
import { CompetitionTabs } from '@/components/dashboard/competition-tabs';
import { getOwnedCompetition } from '@/app/actions/competition-actions';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCompetitionPage({ params }: PageProps) {
  const { id } = await params;
  const competition = await getOwnedCompetition(id);

  if (!competition) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réglages du concours"
        description="Modifiez les informations, les packs de votes et la diffusion."
      />

      <CompetitionTabs
        competitionId={competition.id}
        liveEnabled={competition.live?.enabled}
      />

      <div className="mx-auto max-w-3xl">
        <CompetitionForm competition={competition} />
      </div>
    </div>
  );
}
