
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t bg-gray-700 text-gray-300">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7 text-primary"
              >
                <rect width="8" height="16" x="8" y="4" rx="2" ry="2" />
                <path d="M10 4h4" />
                <path d="M10 20h4" />
                <path d="m8 12-5 2" />
                <path d="m16 12 5 2" />
                <path d="M8 8H4" />
                <path d="M16 8h4" />
              </svg>
              <span className="font-headline text-xl font-bold text-white">
                ClicBillet
              </span>
            </Link>
            <p className="text-sm">
              La plateforme n°1 pour les événements en Côte d'Ivoire.
            </p>
          </div>
          <div>
            <h3 className="mb-4 font-headline font-semibold text-white">Pour les Acheteurs</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/events" className="hover:text-primary">
                  Parcourir les événements
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary">
                  Support
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 font-headline font-semibold text-white">Pour les Organisateurs</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-primary">
                  Tableau de bord
                </Link>
              </li>
              <li>
                <Link href="/dashboard/events/create" className="hover:text-primary">
                  Créer un événement
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-primary">
                  Tarifs
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 font-headline font-semibold text-white">Légal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/cgu" className="hover:text-primary">
                  Conditions de Vente
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary">
                  Politique de Confidentialité
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-600 pt-4 text-center text-sm">
          © {currentYear} ClicBillet. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
