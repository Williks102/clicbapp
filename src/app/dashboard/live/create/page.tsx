import { PageHeader } from '@/components/page-header';
import { CompetitionForm } from '@/components/competition-form';

export const metadata = {
  title: 'Créer un direct | ClicVote',
};

/**
 * Création d'un événement diffusé sans scrutin.
 *
 * Même entité et même formulaire que les concours : seul ce qui est demandé à
 * l'organisateur change. Un parcours distinct évite de lui faire traverser des
 * réglages de vote pour une simple retransmission.
 */
export default function CreateLiveEventPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Créer un direct"
        description="Diffusez un événement sans organiser de vote : flux, accès payant et chat."
      />
      <CompetitionForm mode="live" />
    </div>
  );
}
