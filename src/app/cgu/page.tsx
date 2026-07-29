import { PageHeader } from '@/components/page-header';
import Footer from '@/components/footer';
import MainNav from '@/components/main-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: "Conditions Générales d'Utilisation et de Vente | ClicVote",
  description:
    "Consultez les conditions générales d'utilisation et de vente de ClicVote CI.",
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-headline mb-4 mt-8 text-2xl font-bold">{children}</h2>
);

const SubsectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-headline mb-3 mt-6 text-lg font-semibold">{children}</h3>
);

const HighlightBox = ({ children }: { children: React.ReactNode }) => (
  <div className="my-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
    {children}
  </div>
);

export default function CGUPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />

      <main className="flex-1 bg-secondary/30 py-12 md:py-16">
        <div className="container max-w-4xl">
          <Card>
            <CardContent className="p-6 md:p-10">
              <div className="mb-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-primary" />
                <PageHeader
                  title="Conditions Générales d'Utilisation et de Vente"
                  description="ClicVote CI — Plateforme de vote en ligne et de diffusion d'événements en direct"
                  className="mt-4"
                />
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <strong>Dernière mise à jour :</strong> 28/07/2026
                </div>
              </div>

              <Separator />

              <div className="prose prose-lg mt-8 max-w-none text-foreground/90">
                <SectionTitle>1. Présentation</SectionTitle>
                <p>
                  Les présentes conditions générales d&apos;utilisation et de vente,
                  ci-après dénommées <strong>« CGUV »</strong>, définissent les droits
                  et obligations des parties dans le cadre de l&apos;utilisation de la
                  plateforme <strong>CLICVOTE</strong>, de l&apos;achat de packs de
                  votes et de l&apos;accès aux diffusions en direct.
                </p>
                <p>
                  Elles sont conclues d&apos;une part par la société{' '}
                  <strong>KOULIBALY ABISCHEK FINANCE MULTIBANKING FINANCE</strong> au
                  capital de <strong>1 000 000 FCFA</strong>, dont le siège social est
                  situé au <strong>7 AVENUE NORGUES, IMMEUBLE BSIC</strong>,
                  immatriculée au registre du commerce et des sociétés d&apos;Abidjan
                  sous le numéro <strong>CI-ABJ-2017-B-21203</strong>, éditrice de la
                  plateforme, ci-après dénommée <strong>« CLICVOTE »</strong>, et
                  d&apos;autre part par toute personne physique ou morale, ci-après
                  dénommée <strong>« l&apos;Utilisateur »</strong>, accédant à la
                  plateforme ou y effectuant un achat.
                </p>

                <SubsectionTitle>1.1 Définitions</SubsectionTitle>
                <ul>
                  <li>
                    <strong>Concours :</strong> compétition publiée sur la plateforme
                    par un Organisateur, ouverte au vote du public pendant une période
                    déterminée.
                  </li>
                  <li>
                    <strong>Organisateur :</strong> personne physique ou morale qui
                    crée et administre un Concours, ses candidats et sa diffusion.
                  </li>
                  <li>
                    <strong>Candidat :</strong> participant présenté au vote du public
                    dans le cadre d&apos;un Concours.
                  </li>
                  <li>
                    <strong>Vote gratuit :</strong> vote unique offert à tout
                    Utilisateur disposant d&apos;un compte, renouvelé après le délai
                    d&apos;attente défini par l&apos;Organisateur.
                  </li>
                  <li>
                    <strong>Pack de votes :</strong> lot de votes payant, proposé à un
                    prix fixé par l&apos;Organisateur.
                  </li>
                  <li>
                    <strong>Accès au direct :</strong> droit d&apos;accès individuel à
                    la diffusion en direct d&apos;un Concours lorsque celle-ci est
                    payante.
                  </li>
                </ul>

                <SectionTitle>2. Objet de la plateforme</SectionTitle>
                <p>
                  CLICVOTE met à disposition des Organisateurs un service technique
                  leur permettant de publier des Concours, de recueillir les votes du
                  public et de diffuser leurs événements en direct. CLICVOTE
                  intervient en qualité de <strong>prestataire technique</strong> et
                  de <strong>mandataire de l&apos;Organisateur</strong> pour
                  l&apos;encaissement des sommes dues.
                </p>
                <HighlightBox>
                  CLICVOTE ne fixe ni le prix des packs de votes, ni le règlement des
                  Concours, ni la désignation des vainqueurs. Ces éléments relèvent de
                  la seule responsabilité de l&apos;Organisateur.
                </HighlightBox>

                <SectionTitle>3. Compte utilisateur</SectionTitle>
                <p>
                  La création d&apos;un compte est requise pour utiliser le vote
                  gratuit, participer au chat des diffusions et accéder aux directs
                  payants. L&apos;Utilisateur s&apos;engage à fournir des informations
                  exactes et à préserver la confidentialité de ses identifiants.
                </p>
                <p>
                  Un compte par personne est autorisé. La création de comptes
                  multiples dans le but de contourner la limite de votes gratuits
                  constitue une fraude et peut entraîner la suspension du compte et
                  l&apos;annulation des votes concernés.
                </p>

                <SectionTitle>4. Votes</SectionTitle>
                <SubsectionTitle>4.1 Vote gratuit</SubsectionTitle>
                <p>
                  Lorsque l&apos;Organisateur l&apos;active, chaque Utilisateur
                  connecté dispose d&apos;un vote gratuit par Concours, renouvelable
                  après le délai d&apos;attente indiqué sur la page du Concours. Le
                  vote gratuit ne peut être ni cédé, ni cumulé, ni reporté.
                </p>

                <SubsectionTitle>4.2 Packs de votes payants</SubsectionTitle>
                <p>
                  Les packs de votes sont proposés au prix affiché sur la page du
                  Candidat, exprimé en <strong>francs CFA (XOF)</strong>. Les votes
                  sont crédités au Candidat désigné lors de l&apos;achat, dès
                  confirmation du paiement par l&apos;opérateur.
                </p>
                <HighlightBox>
                  Les votes sont <strong>nominatifs et définitifs</strong> : ils ne
                  peuvent être transférés vers un autre Candidat ni vers un autre
                  Concours après validation du paiement.
                </HighlightBox>

                <SubsectionTitle>4.3 Période de vote</SubsectionTitle>
                <p>
                  Les votes ne sont acceptés que pendant la période d&apos;ouverture
                  indiquée sur la page du Concours. Aucun vote ne peut être enregistré
                  après la clôture, y compris si un paiement était en cours au moment
                  de celle-ci ; dans cette hypothèse, la commande est remboursée.
                </p>

                <SectionTitle>5. Diffusion en direct</SectionTitle>
                <p>
                  Lorsqu&apos;un Concours propose une diffusion en direct payante,
                  l&apos;accès est personnel, individuel et rattaché au compte de
                  l&apos;acheteur. Le partage d&apos;identifiants en vue de permettre
                  à des tiers d&apos;accéder à la diffusion est interdit.
                </p>
                <p>
                  La diffusion est assurée au moyen du flux fourni par
                  l&apos;Organisateur. CLICVOTE met en œuvre les moyens raisonnables
                  pour assurer la disponibilité du service, sans pouvoir garantir
                  l&apos;absence totale d&apos;interruption liée aux réseaux ou aux
                  plateformes vidéo tierces.
                </p>

                <SectionTitle>6. Paiement</SectionTitle>
                <p>
                  Les paiements sont réalisés par <strong>Mobile Money</strong> ou par{' '}
                  <strong>carte bancaire</strong>, via le prestataire de paiement
                  sécurisé. Le montant débité correspond au prix affiché au moment de
                  la commande. Une confirmation est adressée par courrier électronique
                  après validation du paiement.
                </p>
                <p>
                  En cas d&apos;échec du paiement, aucun vote n&apos;est crédité et
                  aucun accès n&apos;est ouvert. La commande peut être relancée depuis
                  la page du Candidat ou du direct.
                </p>

                <SectionTitle>7. Droit de rétractation et remboursement</SectionTitle>
                <p>
                  Conformément à la nature des services proposés — contenus numériques
                  fournis immédiatement et services de divertissement rattachés à une
                  date déterminée — les votes achetés et les accès aux directs
                  <strong> ne font pas l&apos;objet d&apos;un droit de rétractation</strong>{' '}
                  une fois la prestation exécutée.
                </p>
                <p>Un remboursement est néanmoins accordé dans les cas suivants :</p>
                <ul>
                  <li>annulation du Concours par l&apos;Organisateur ;</li>
                  <li>
                    annulation définitive de la diffusion en direct sans rediffusion
                    proposée ;
                  </li>
                  <li>
                    votes débités sans avoir été crédités au Candidat désigné, du fait
                    d&apos;un dysfonctionnement technique.
                  </li>
                </ul>
                <p>
                  Toute demande doit être adressée à{' '}
                  <a
                    href="mailto:contact@clicvote.com"
                    className="text-primary hover:underline"
                  >
                    contact@clicvote.com
                  </a>{' '}
                  dans un délai de <strong>sept (7) jours</strong> suivant les faits,
                  en précisant la référence de la commande.
                </p>

                <SectionTitle>8. Intégrité des votes</SectionTitle>
                <p>
                  CLICVOTE met en œuvre des mesures destinées à garantir la sincérité
                  des scrutins : identification des comptes, délai entre deux votes
                  gratuits, contrôle du montant des paiements et journalisation des
                  votes.
                </p>
                <p>Sont notamment interdits et sanctionnés par l&apos;annulation des votes :</p>
                <ul>
                  <li>la création de comptes multiples par une même personne ;</li>
                  <li>
                    l&apos;utilisation de robots, scripts ou tout dispositif
                    automatisé de vote ;
                  </li>
                  <li>l&apos;usage de moyens de paiement frauduleux ;</li>
                  <li>toute tentative d&apos;altération des compteurs de votes.</li>
                </ul>

                <SectionTitle>9. Obligations de l&apos;Organisateur</SectionTitle>
                <p>L&apos;Organisateur garantit :</p>
                <ul>
                  <li>
                    disposer des droits et autorisations nécessaires sur les images,
                    noms et contenus des Candidats publiés ;
                  </li>
                  <li>
                    disposer des droits de diffusion sur les contenus retransmis en
                    direct ;
                  </li>
                  <li>
                    publier un règlement de concours clair et le respecter, notamment
                    quant à la désignation du vainqueur ;
                  </li>
                  <li>
                    traiter les données des votants conformément à la réglementation
                    applicable.
                  </li>
                </ul>

                <SectionTitle>10. Modération du chat</SectionTitle>
                <p>
                  Les chats associés aux diffusions sont modérés par l&apos;Organisateur
                  et par CLICVOTE. Les propos injurieux, haineux, diffamatoires, à
                  caractère publicitaire non sollicité ou contraires à la loi sont
                  supprimés et peuvent entraîner l&apos;exclusion définitive de leur
                  auteur.
                </p>

                <SectionTitle>11. Responsabilité</SectionTitle>
                <p>
                  CLICVOTE ne saurait être tenue responsable de l&apos;organisation du
                  Concours, du déroulement de l&apos;événement, de la désignation du
                  vainqueur ou de la remise des prix, qui relèvent de
                  l&apos;Organisateur. La responsabilité de CLICVOTE est limitée aux
                  seuls dysfonctionnements de la plateforme qui lui sont directement
                  imputables.
                </p>

                <SectionTitle>12. Données personnelles</SectionTitle>
                <p>
                  Le traitement des données personnelles est décrit dans notre{' '}
                  <Link href="/privacy" className="text-primary hover:underline">
                    politique de confidentialité
                  </Link>
                  .
                </p>

                <SectionTitle>13. Droit applicable</SectionTitle>
                <p>
                  Les présentes CGUV sont soumises au <strong>droit ivoirien</strong>.
                  À défaut de résolution amiable, tout litige relève de la compétence
                  des tribunaux d&apos;Abidjan.
                </p>

                <SectionTitle>14. Contact</SectionTitle>
                <p>
                  Pour toute question relative aux présentes conditions, écrivez-nous
                  via la{' '}
                  <Link href="/contact" className="text-primary hover:underline">
                    page de contact
                  </Link>{' '}
                  ou à l&apos;adresse{' '}
                  <a
                    href="mailto:contact@clicvote.com"
                    className="text-primary hover:underline"
                  >
                    contact@clicvote.com
                  </a>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
