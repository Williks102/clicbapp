
import { PageHeader } from '@/components/page-header';
import Footer from '@/components/footer';
import MainNav from '@/components/main-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  Calendar,
  Globe,
  MapMarkerAlt,
  Laptop,
  MousePointer,
  Eye,
  User,
  Cake,
  Mail,
  Phone,
  Home,
  IdCard,
  CreditCard,
  Keyboard,
  Users,
  Building,
  Mailbox,
  AlertTriangle,
  Clock,
  UserShield,
  Headset,
} from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Politique de Confidentialité | ClicBillet',
  description:
    'Consultez la politique de confidentialité de ClicBillet CI.',
};

// Helper components for styling
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-headline text-2xl font-bold mt-8 mb-4">{children}</h2>
);

const SubsectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-headline text-lg font-semibold mt-6 mb-3">{children}</h3>
);

const HighlightBox = ({
  children,
  variant = 'warning',
}: {
  children: React.ReactNode;
  variant?: 'warning' | 'info' | 'success';
}) => {
  const baseClasses = 'my-6 rounded-lg border p-4';
  const variants = {
    warning: 'border-yellow-300 bg-yellow-50 text-yellow-800',
    info: 'border-blue-300 bg-blue-50 text-blue-800',
    success: 'border-green-300 bg-green-50 text-green-800',
  };
  return <div className={`${baseClasses} ${variants[variant]}`}>{children}</div>;
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 bg-secondary/30 py-12 md:py-16">
        <div className="container max-w-4xl">
          <Card>
            <CardContent className="p-6 md:p-10">
              <div className="text-center mb-8">
                <Shield className="mx-auto h-12 w-12 text-primary" />
                <PageHeader
                  title="Politique de confidentialité"
                  description="ClicBillet CI - Plateforme de billetterie ivoirienne"
                  className="mt-4"
                />
                <div className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <strong>Dernière mise à jour :</strong> 04/12/2025
                </div>
              </div>

              <Separator />

              <div className="prose prose-lg max-w-none text-foreground/90 mt-8">
                <SectionTitle>
                  Le but de cette politique de confidentialité
                </SectionTitle>
                <p>
                  Cette politique de confidentialité s'applique à toutes les
                  données personnelles traitées par <strong>ClicBillet CI</strong>{' '}
                  en tant que responsable de traitement conformément au droit
                  ivoirien, notamment à la loi n°2013-450 du 19 juin 2013
                  relative à la protection des données personnelles.
                </p>
                <p>
                  La présente politique de confidentialité a pour objet
                  d'informer les utilisateurs de notre plateforme des données
                  personnelles que nous collectons et des informations
                  suivantes, le cas échéant :
                </p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Les données personnelles que nous collectons</li>
                  <li>L'utilisation des données recueillies</li>
                  <li>Qui a accès aux données recueillies</li>
                  <li>Les droits des utilisateurs de la plateforme</li>
                  <li>La politique de cookies de la plateforme</li>
                </ol>

                <SectionTitle>Consentement</SectionTitle>
                <p>
                  Les utilisateurs conviennent qu'en utilisant notre
                  plateforme, ils consentent à :
                </p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>
                    les conditions énoncées dans la présente politique de
                    confidentialité et
                  </li>
                  <li>
                    la collecte, l'utilisation et la conservation des données
                    énumérées dans cette politique.
                  </li>
                </ol>
                <HighlightBox variant="warning">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-3 mt-1" />
                    <div>
                      <strong>Important :</strong> En utilisant notre
                      plateforme, vous consentez aux conditions de cette
                      politique et à la collecte de données énumérées.
                    </div>
                  </div>
                </HighlightBox>

                <SectionTitle>Données personnelles que nous collectons</SectionTitle>
                <SubsectionTitle>Données collectées automatiquement</SubsectionTitle>
                <p>
                  Lorsque vous visitez et utilisez notre plateforme, nous
                  pouvons collecter et stocker automatiquement les informations
                  suivantes :
                </p>
                <ul className="list-none pl-0 space-y-2">
                  <li className="flex items-center"><Globe className="h-5 w-5 mr-3 text-primary" /> Adresse IP</li>
                  <li className="flex items-center"><MapPin className="h-5 w-5 mr-3 text-primary" /> Lieu (localisation approximative)</li>
                  <li className="flex items-center"><Laptop className="h-5 w-5 mr-3 text-primary" /> Détails matériels et logiciels</li>
                  <li className="flex items-center"><MousePointer className="h-5 w-5 mr-3 text-primary" /> Liens sur lesquels vous cliquez</li>
                  <li className="flex items-center"><Eye className="h-5 w-5 mr-3 text-primary" /> Contenus que vous consultez</li>
                </ul>

                <SubsectionTitle>Données collectées de façon non automatique</SubsectionTitle>
                <p>
                  Nous pouvons également collecter les données suivantes lorsque
                  vous exécutez certaines fonctions sur notre plateforme :
                </p>
                <ul className="list-none pl-0 space-y-2">
                  <li className="flex items-center"><User className="h-5 w-5 mr-3 text-primary" /> Prénom et nom</li>
                  <li className="flex items-center"><Cake className="h-5 w-5 mr-3 text-primary" /> Date de naissance</li>
                  <li className="flex items-center"><Mail className="h-5 w-5 mr-3 text-primary" /> Email</li>
                  <li className="flex items-center"><Phone className="h-5 w-5 mr-3 text-primary" /> Numéro de téléphone</li>
                  <li className="flex items-center"><Home className="h-5 w-5 mr-3 text-primary" /> Adresse de domicile</li>
                  <li className="flex items-center"><IdCard className="h-5 w-5 mr-3 text-primary" /> Documents d'identité</li>
                  <li className="flex items-center"><CreditCard className="h-5 w-5 mr-3 text-primary" /> Informations de paiement</li>
                  <li className="flex items-center"><Keyboard className="h-5 w-5 mr-3 text-primary" /> Données de remplissage automatique</li>
                </ul>

                <SectionTitle>Comment utilisons-nous les données personnelles ?</SectionTitle>
                <p>
                  Les données personnelles collectées sur notre plateforme ne seront utilisées que pour les finalités précisées dans la présente politique ou indiquées sur les pages concernées de notre plateforme. Nous n'utilisons pas vos données au-delà de ce que nous divulguons.
                </p>
                
                <SectionTitle>Avec qui partageons-nous les données personnelles ?</SectionTitle>
                <SubsectionTitle>Employés</SubsectionTitle>
                <p>
                  Nous pouvons divulguer à tout membre de notre organisation les données utilisateur dont il a raisonnablement besoin pour remplir les objectifs énoncés dans la présente politique.
                </p>
                <SubsectionTitle>Tierces parties</SubsectionTitle>
                <p>
                  Nous pouvons partager des données utilisateur avec les tiers suivants : Organisateurs d'événements, Prestataires de paiement, Services de messagerie. Les tiers ne pourront pas accéder aux données de l'utilisateur au-delà de ce qui est raisonnablement nécessaire pour atteindre l'objectif donné.
                </p>

                <SectionTitle>Combien de temps conservons-nous les données personnelles ?</SectionTitle>
                <p>
                  Nous ne conservons pas les données des utilisateurs au-delà de ce qui est nécessaire pour remplir les finalités pour lesquelles elles sont collectées.
                </p>

                <SectionTitle>Comment protégeons-nous les données personnelles ?</SectionTitle>
                <p>
                  Pour nous assurer que votre sécurité est protégée, nous utilisons le protocole de sécurité de la couche de transport pour transmettre des informations personnelles via notre système. Toutes les données stockées dans notre système sont bien sécurisées et ne sont accessibles qu'à nos employés sous accord de confidentialité.
                </p>

                <SectionTitle>Vos droits en tant qu'utilisateur</SectionTitle>
                <HighlightBox variant="info">
                    <h4 className="font-semibold mb-2 flex items-center"><UserShield className="h-5 w-5 mr-2"/>Droits garantis</h4>
                    <p>Vous disposez des droits d'accès, de rectification, d'effacement, de restriction du traitement, à la portabilité des données et d'objection.</p>
                </HighlightBox>
                
                <SectionTitle>Comment modifier, supprimer ou contester les données collectées ?</SectionTitle>
                <HighlightBox variant="success">
                    <h4 className="font-semibold mb-2 flex items-center"><Headset className="h-5 w-5 mr-2"/>Contact Data Protection Officer (DPO)</h4>
                    <ul className="list-none p-0 space-y-1">
                        <li><strong>Email spécialisé :</strong> privacy@clicbillet.com</li>
                        <li><strong>Email général :</strong> contact@clicbillet.com</li>
                        <li><strong>Téléphone :</strong> +225 07 02 49 02 77</li>
                    </ul>
                </HighlightBox>

                <SectionTitle>Modifications</SectionTitle>
                <p>
                  Cette politique de confidentialité peut être modifiée à l'occasion afin de maintenir la conformité avec la loi et de tenir compte de tout changement à notre processus de collecte de données.
                </p>
                
                 <Separator className="my-8" />
                
                <div className="text-center">
                    <p className="text-muted-foreground">
                        Date d'entrée en vigueur : le 1er janvier 2024
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-primary bg-primary/10 hover:bg-primary/20">
                            Retour à l'accueil
                        </Link>
                        <Link href="/cgu" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary/90">
                            Voir les CGV
                        </Link>
                    </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
