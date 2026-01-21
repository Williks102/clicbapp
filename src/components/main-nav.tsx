'use client';

import Link from 'next/link';
import {
  Ticket,
  Menu,
  UserCircle,
  Search,
  ShoppingCart,
  UserPlus,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { LogOut } from 'lucide-react';

export default function MainNav() {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/events', label: 'Événements' },
    { href: '/livestreams', label: 'En Direct' },
    { href: '/contact', label: 'Contact' },
  ];

  const userRole = session?.user?.role;
  const dashboardHref = userRole === 'admin' ? '/admin' : '/dashboard';

  const UserMenu = () => {
    if (status === 'loading') {
      return null; // ou un skeleton
    }

    if (session) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="overflow-hidden rounded-full"
            >
              <Avatar>
                <AvatarFallback>
                  {session.user?.name?.charAt(0) ||
                    session.user?.email?.charAt(0) ||
                    'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">Mes Billets</Link>
            </DropdownMenuItem>

            {(userRole === 'admin' || userRole === 'organizer') && (
              <DropdownMenuItem asChild>
                <Link href={dashboardHref}>Tableau de bord</Link>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <>
        <Button variant="ghost" asChild>
          <Link href="/login">Connexion</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Créer un compte</Link>
        </Button>
      </>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="mr-6 flex items-center gap-2">
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
          <span className="font-headline text-xl font-bold">ClicBillet</span>
          <span className="ml-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
            CI
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                'transition-colors hover:text-primary',
                pathname === link.href ||
                  (link.href === '/events' &&
                    pathname.startsWith('/events/'))
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-4 md:flex">
          <UserMenu />
        </div>
        {isMobile && (
          <div className="ml-auto md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex h-full flex-col p-6">
                  <Link href="/" className="mb-8 flex items-center gap-2">
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
                    <span className="font-headline text-xl font-bold">
                      ClicBillet
                    </span>
                  </Link>
                  <nav className="flex flex-col gap-4">
                    {navLinks.map((link) => (
                      <SheetClose asChild key={link.label}>
                        <Link href={link.href} className="text-lg">
                          {link.label}
                        </Link>
                      </SheetClose>
                    ))}

                    {/* Liens utilisateur connecté */}
                    {session && (
                      <>
                        <div className="my-4 h-px bg-border" />
                        <div className="text-sm font-semibold text-muted-foreground">
                          Mon Compte
                        </div>
                        <SheetClose asChild>
                          <Link href="/account" className="text-lg">
                            Mes Billets
                          </Link>
                        </SheetClose>
                        
                        {(userRole === 'admin' || userRole === 'organizer') && (
                          <SheetClose asChild>
                            <Link href={dashboardHref} className="text-lg">
                              Tableau de bord
                            </Link>
                          </SheetClose>
                        )}
                      </>
                    )}

                    {/* Liens utilisateur non connecté */}
                    {!session && (
                      <SheetClose asChild>
                        <Link href="/login" className="text-lg">
                          Connexion
                        </Link>
                      </SheetClose>
                    )}
                  </nav>

                  {/* Bouton en bas */}
                  {session ? (
                    <Button
                      variant="outline"
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="mt-auto"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Déconnexion
                    </Button>
                  ) : (
                    <Button asChild className="mt-auto">
                      <Link href="/signup">Créer un compte</Link>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </header>
  );
}
