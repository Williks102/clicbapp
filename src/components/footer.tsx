import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-slate-900 text-slate-300">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <BrandLogo inverted showTag={false} />
            <p className="text-sm">
              Votez pour vos favoris et vivez les grands événements en direct,
              depuis la Côte d&apos;Ivoire et partout ailleurs.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-headline font-semibold text-white">Le public</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/competitions" className="hover:text-primary">
                  Tous les concours
                </Link>
              </li>
              <li>
                <Link href="/live" className="hover:text-primary">
                  Diffusions en direct
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-primary">
                  Mes votes &amp; accès
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary">
                  Contact &amp; support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-headline font-semibold text-white">
              Les organisateurs
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-primary">
                  Tableau de bord
                </Link>
              </li>
              <li>
                <Link href="/dashboard/competitions/create" className="hover:text-primary">
                  Lancer un concours
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-primary">
                  Devenir organisateur
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-headline font-semibold text-white">Légal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/cgu" className="hover:text-primary">
                  Conditions d&apos;utilisation
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary">
                  Politique de confidentialité
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-700 pt-4 text-center text-sm">
          © {currentYear} ClicVote. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
