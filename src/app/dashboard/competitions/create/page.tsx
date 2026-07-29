import { PageHeader } from '@/components/page-header';
import { CompetitionForm } from '@/components/competition-form';

export const metadata = {
  title: 'Créer un concours | ClicVote',
};

export default function CreateCompetitionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Créer un concours"
        description="Définissez votre compétition, vos packs de votes et votre diffusion en direct."
      />
      <CompetitionForm />
    </div>
  );
}
