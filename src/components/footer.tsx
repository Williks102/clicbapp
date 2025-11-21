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
                viewBox="0 0 24"
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
                <Link href="#" className="hover:text-primary">
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
            <h3 className="mb-4 font-headline font-semibold text-white">Suivez-nous</h3>
            <div className="flex space-x-4">
              {/* Placeholder for social icons */}
              <Link href="#" className="hover:text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </Link>
              <Link href="#" className="hover:text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </Link>
              <Link href="#" className="hover:text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter"><path d="M22 4s-.7 2.1-2 3.4c1.6 1.4 3.3 4.4 3.3 4.4s-1.4-1.4-2.8-1.2c-.7 2.3-2.5 4.5-5 5.5s-5.1 1.6-7.1-1.2c-1.8-2.6-2.3-6.1 1.2-8.5s6.1-2.3 8.5 1.2c.7-1.2 2.8-3.3 2.8-3.3s-.5 1.4-1.2 2.8c1.1.7 2.3 2.1 2.3 2.1z"/></svg>
              </Link>
            </div>
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
